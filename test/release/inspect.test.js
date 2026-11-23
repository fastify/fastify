'use strict'

const { describe, test, before, after } = require('node:test')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { findSpecifiers, inspectPackage, readTarball } = require('../../scripts/release/inspect')
const { loadArtifact, pack, parsePackOutput } = require('../../scripts/release/pack')
const { ROOT, snapshotTree, diffSnapshots } = require('../../scripts/release/util')

function write (root, files) {
  for (const [file, content] of Object.entries(files)) {
    const full = path.join(root, file)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content))
  }
}

// A miniature package with the same shape as Fastify.
const manifest = {
  name: 'fastify',
  version: '1.2.3',
  main: 'fastify.js',
  types: 'fastify.d.ts',
  files: ['fastify.js', 'fastify.d.ts', 'lib/**/*.js', 'types/**/*.d.ts'],
  dependencies: { 'real-dep': '^1.0.0' },
  devDependencies: { 'dev-dep': '^1.0.0' }
}
const baseline = {
  'package.json': manifest,
  'README.md': 'readme',
  LICENSE: 'license',
  'fastify.js': "const VERSION = '1.2.3'\nrequire('./lib/a')\nrequire('real-dep/sub')\n",
  'fastify.d.ts': "import { A } from './types/a'\nimport 'node:http'\n",
  'lib/a.js': "// require('dev-dep') in a comment is fine\nconst accept = '*/*'\n",
  'types/a.d.ts': 'export type A = string\n',
  'test/a.test.js': 'repository only'
}

describe('the packed package is inspected', () => {
  let work

  before(() => { work = fs.mkdtempSync(path.join(os.tmpdir(), 'fastify-inspect-test-')) })
  after(() => fs.rmSync(work, { recursive: true, force: true }))

  let count = 0
  async function packFixture (changes = {}) {
    const dir = path.join(work, `case-${count++}`)
    const files = { ...baseline, ...changes }
    for (const [file, content] of Object.entries(files)) {
      if (content === null) delete files[file]
    }
    write(path.join(dir, 'source'), files)
    const out = path.join(dir, 'out')
    return { source: path.join(dir, 'source'), out, promise: pack(out, { sourceDir: path.join(dir, 'source') }) }
  }

  test('a good package passes and its identity is recorded', async t => {
    const { out, promise } = await packFixture()
    const artifact = await promise
    t.assert.match(artifact.integrity, /^sha512-/)
    t.assert.deepStrictEqual(artifact.files, [
      'LICENSE', 'README.md', 'fastify.d.ts', 'fastify.js', 'lib/a.js', 'package.json', 'types/a.d.ts'
    ])
    t.assert.strictEqual(loadArtifact(out).integrity, artifact.integrity)
  })

  test('a tarball that changed after packing is refused', async t => {
    const { out, promise } = await packFixture()
    const artifact = await promise
    fs.appendFileSync(path.join(out, artifact.filename), 'x')
    t.assert.throws(() => loadArtifact(out), /is not the packed artifact/)
  })

  const rejected = {
    'repository-only files': [
      { 'package.json': { ...manifest, files: [...manifest.files, 'test'] } },
      /unexpected file in package: test\/a\.test\.js/
    ],
    'a runtime file left out': [
      { 'package.json': { ...manifest, files: ['fastify.js', 'fastify.d.ts', 'types'] } },
      /missing from package: lib\/a\.js[\s\S]*imports '\.\/lib\/a', which is not in the package/
    ],
    'a declaration file left out': [
      { 'package.json': { ...manifest, files: ['fastify.js', 'fastify.d.ts', 'lib'] } },
      /missing from package: types\/a\.d\.ts/
    ],
    'a new kind of file that "files" does not cover': [
      { 'lib/data.json': '{}' },
      /missing from package: lib\/data\.json/
    ],
    'a runtime import of a devDependency': [
      { 'lib/a.js': "require('dev-dep')\n" },
      /lib\/a\.js imports 'dev-dep', but 'dev-dep' is not in "dependencies"/
    ],
    'a type import of an undeclared package': [
      { 'types/a.d.ts': "export type A = import('@scope/missing/deep').A\n" },
      /'@scope\/missing' is not in "dependencies"/
    ],
    'an undeclared triple-slash type reference': [
      { 'types/a.d.ts': '/// <reference types="missing" />\nexport type A = string\n' },
      /'missing' is not in "dependencies"/
    ],
    'a version that was not synchronized': [
      { 'fastify.js': "const VERSION = '1.2.2'\n" },
      /VERSION is '1\.2\.2' but package\.json version is '1\.2\.3'[\s\S]*build:sync-version/
    ],
    'an install script': [
      { 'package.json': { ...manifest, scripts: { postinstall: 'node x.js' } } },
      /"postinstall" script/
    ],
    'a dependency that is not from the registry': [
      { 'package.json': { ...manifest, dependencies: { 'real-dep': 'file:../real-dep' } } },
      /dependency "real-dep" uses "file:\.\.\/real-dep"/
    ],
    'a missing types entry point': [
      { 'package.json': { ...manifest, types: 'index.d.ts' } },
      /"types" points to index\.d\.ts/
    ]
  }

  for (const [name, [changes, expected]] of Object.entries(rejected)) {
    test(`rejects ${name}`, async t => {
      const { promise } = await packFixture(changes)
      await t.assert.rejects(promise, { name: 'ReleaseError', message: expected })
    })
  }

  test('detects a tarball that no longer matches the sources', async t => {
    const { source, out, promise } = await packFixture()
    const artifact = await promise
    fs.appendFileSync(path.join(source, 'lib', 'a.js'), '// edited after packing\n')
    const files = readTarball(fs.readFileSync(path.join(out, artifact.filename)))
    t.assert.deepStrictEqual(inspectPackage(files, source),
      ['lib/a.js in the tarball differs from the file in the repository'])
  })
})

test('the real Fastify package passes inspection without touching the repository', async t => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'fastify-pack-test-'))
  t.after(() => fs.rmSync(out, { recursive: true, force: true }))
  const before = ['lib', 'types'].map(dir => snapshotTree(path.join(ROOT, dir)))
  const artifact = await pack(out)
  ;['lib', 'types'].forEach((dir, i) => {
    t.assert.deepStrictEqual(diffSnapshots(before[i], snapshotTree(path.join(ROOT, dir))), [])
  })
  t.assert.ok(artifact.files.includes('lib/symbols.js'))
  t.assert.ok(artifact.files.every(file => !/^(?:test|docs|build|scripts|examples|\.github)\//.test(file)))
})

test('`npm pack --json` output is understood across npm versions', t => {
  const entry = { name: 'fastify', version: '1.2.3', filename: 'fastify-1.2.3.tgz' }
  t.assert.deepStrictEqual(parsePackOutput(JSON.stringify([entry])), entry)
  t.assert.deepStrictEqual(parsePackOutput(JSON.stringify({ fastify: entry })), entry)
  t.assert.throws(() => parsePackOutput('{}'), /unrecognized/)
})

test('import specifiers are found without being confused by comments', t => {
  t.assert.deepStrictEqual(findSpecifiers([
    "const a = '*/*'; require('one')",
    '/* require("no") */',
    "const url = 'http://x' // require('no')",
    'const re = /["\']/g; require("two")',
    'import x from "three"',
    "await import('four')",
    "export * from './five'",
    "obj.require('no')"
  ].join('\n')).sort(), ['./five', 'four', 'one', 'three', 'two'])
})
