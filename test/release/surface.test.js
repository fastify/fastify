'use strict'

// Keeps the release gate in step with the things it is meant to protect.

const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const { stripVTControlCharacters } = require('node:util')
const policy = require('../../scripts/release/policy')

const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

function job (workflow, name) {
  const text = read(`.github/workflows/${workflow}`)
  const start = text.indexOf(`\n  ${name}:\n`)
  if (start === -1) throw new Error(`${workflow} has no job "${name}"`)
  const rest = text.slice(start + 1)
  const end = rest.slice(1).search(/\n {2}[\w-]+:\n/)
  return end === -1 ? rest : rest.slice(0, end + 1)
}

const list = (text, key) => new RegExp(`\\n\\s+${key}: \\[(.*)\\]`).exec(text)[1].split(', ')

test('every workflow validates the same Node.js versions and systems', t => {
  const reference = job('ci.yml', 'test-unit')
  const versions = policy.NODE_VERSIONS.map(String)
  const systems = list(reference, 'os')
  t.assert.deepStrictEqual(list(reference, 'node-version'), versions,
    'update NODE_VERSIONS in scripts/release/policy.js to match ci.yml')
  for (const [workflow, name] of [['package-validation.yml', 'verify'], ['release.yml', 'test']]) {
    t.assert.deepStrictEqual(list(job(workflow, name), 'node-version'), versions, workflow)
    t.assert.deepStrictEqual(list(job(workflow, name), 'os'), systems, workflow)
  }
  t.assert.strictEqual(policy.CI_PLATFORMS.length, systems.length)
  t.assert.ok(job('release.yml', 'publish').includes(`--platforms ${policy.CI_PLATFORMS.join(',')}`))
})

test('publishing cannot start before every gate has passed', t => {
  const publish = job('release.yml', 'publish')
  for (const gate of ['quality', 'test', 'package']) {
    t.assert.match(publish, new RegExp(`needs:(?:\\n\\s+- [\\w-]+)*\\n\\s+- ${gate}\\n`))
  }
  t.assert.doesNotMatch(publish, /always\(\)|continue-on-error|npm publish|npm pack|npm install/)
  t.assert.match(job('release.yml', 'package'), /uses: \.\/\.github\/workflows\/package-validation\.yml/)
  t.assert.match(job('ci.yml', 'package-validation'), /uses: \.\/\.github\/workflows\/package-validation\.yml/)
})

test('package.json keeps the release entry points', t => {
  const { scripts, files } = JSON.parse(read('package.json'))
  t.assert.strictEqual(scripts['release:check'], 'node scripts/release/cli.js check')
  t.assert.strictEqual(scripts['release:publish'], 'node scripts/release/cli.js publish')
  t.assert.strictEqual(scripts.prepublishOnly, 'node scripts/release/guard.js')
  t.assert.ok(Array.isArray(files), 'package.json needs a "files" allowlist')
})

test('every public type name is imported by the consumer fixture', t => {
  const ts = require('typescript')
  const entry = path.join(root, 'fastify.d.ts').split(path.sep).join('/')
  const program = ts.createProgram([entry], {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    types: []
  })
  const source = program.getSourceFile(entry)
  const namespace = source.statements.find(node => ts.isModuleDeclaration(node) && node.name.text === 'fastify')
  const declared = [...program.getTypeChecker().getSymbolAtLocation(namespace.name).exports.keys()]
    .map(String).filter(name => name !== 'default').sort()
  const fixture = read('scripts/release/fixtures/types/public-names.ts')
  const imported = /export type \{([^}]*)\}/.exec(fixture)[1].split(',').map(name => name.trim()).filter(Boolean)
  t.assert.deepStrictEqual(imported, declared,
    'update scripts/release/fixtures/types/public-names.ts; removing a name is a breaking change')
})

test('every declaration file is deep imported by the consumer fixture', t => {
  const fixture = read('scripts/release/fixtures/types/deep-imports.mts')
  for (const file of fs.readdirSync(path.join(root, 'types'))) {
    t.assert.ok(fixture.includes(`'fastify/types/${file.replace(/\.d\.ts$/, '.js')}'`), file)
  }
})

test('the publish guard fails with directions', t => {
  const { spawnSync } = require('node:child_process')
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'release', 'guard.js')], { encoding: 'utf8' })
  t.assert.strictEqual(result.status, 1)
  t.assert.match(stripVTControlCharacters(result.stderr), /npm run release:publish/)
})
