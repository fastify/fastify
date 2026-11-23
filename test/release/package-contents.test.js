'use strict'

const { test } = require('node:test')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { checkContents, expectedFiles, importSpecifiers, readTarball } = require('../../scripts/release/package-contents')
const { npm } = require('../../scripts/release/run')

const root = path.join(__dirname, '..', '..')

function workingCopy () {
  return new Map(expectedFiles(root).map((file) => [file, fs.readFileSync(path.join(root, file))]))
}

function edit (files, file, change) {
  files.set(file, Buffer.from(change(files.get(file).toString())))
}

test('the package npm would publish has exactly the public surface', async (t) => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'fastify-pack-test-'))
  t.after(() => fs.rmSync(destination, { recursive: true, force: true }))
  await npm(['pack', '--ignore-scripts', '--pack-destination', destination], { cwd: root })

  const files = readTarball(path.join(destination, fs.readdirSync(destination)[0]))

  t.assert.deepStrictEqual(checkContents(files, root), [])
  t.assert.deepStrictEqual([...files.keys()].sort(), expectedFiles(root))
  for (const file of files.keys()) {
    t.assert.doesNotMatch(file, /^(test|docs|examples|build|scripts|integration|\.github)\//)
  }
})

test('content problems are reported with the file at fault', async (t) => {
  const cases = [
    ['missing file', (f) => f.delete('lib/reply.js'), /missing from the package: lib\/reply\.js/],
    ['missing file that is imported', (f) => f.delete('types/utils.d.ts'), /imports "\.\/utils", which is not in the package/],
    ['repository file', (f) => f.set('test/a.test.js', Buffer.from('')), /should not be published: test\/a\.test\.js/],
    ['stale content', (f) => edit(f, 'lib/hooks.js', (s) => s + '//'), /differs from the checkout: lib\/hooks\.js/],
    ['undeclared runtime dependency', (f) => edit(f, 'lib/hooks.js', (s) => s + "\nrequire('borp')\n"), /"borp" is not in "dependencies"/],
    ['undeclared type dependency', (f) => edit(f, 'types/utils.d.ts', (s) => "import x from '@scope/a/b'\n" + s), /"@scope\/a" is not in "dependencies"/],
    ['version drift', (f) => edit(f, 'fastify.js', (s) => s.replace(/const VERSION = .*/, "const VERSION = '0.0.0'")), /VERSION is "0\.0\.0"/],
    ['install script', (f) => edit(f, 'package.json', (s) => s.replace('"scripts": {', '"scripts": { "postinstall": "x",')), /has a "postinstall" script/],
    ['broken types entry', (f) => edit(f, 'package.json', (s) => s.replace('"types": "fastify.d.ts"', '"types": "no.d.ts"')), /"types" points to "no\.d\.ts"/]
  ]

  for (const [name, breakIt, expected] of cases) {
    await t.test(name, (t) => {
      const files = workingCopy()
      breakIt(files)
      t.assert.match(checkContents(files, root).join('\n'), expected)
    })
  }
})

test('imports are found in code and references, but not in comments', (t) => {
  const source = [
    '/// <reference types="node" />',
    '/// <reference path="types/a.d.ts" />',
    "import a from 'a'",
    "import 'b'",
    "export * from './c'",
    "const d = require('d')",
    "type E = import('e').E",
    "// require('commented')",
    '/**',
    " * import x from 'documented'",
    ' */'
  ].join('\n')

  t.assert.deepStrictEqual(importSpecifiers(source), ['node', './types/a.d.ts', 'a', 'b', './c', 'd', 'e'])
})
