'use strict'

/* c8 ignore start */

// Same guarantee as `npm run test:validator:integrity`, without rewriting the
// files in the repository: the build scripts run against a temporary copy.

const fs = require('node:fs')
const path = require('node:path')
const { ReleaseError, ROOT, makeTempDir, run, cleanEnv } = require('./util')

const GENERATED = {
  'lib/error-serializer.js': 'build/build-error-serializer.js',
  'lib/config-validator.js': 'build/build-validation.js'
}

// Mirrors `git diff --ignore-all-space --ignore-blank-lines --ignore-cr-at-eol`.
function normalize (source) {
  return source.split('\n').map(line => line.replace(/\s+/g, '')).filter(Boolean).join('\n')
}

async function checkGenerated (options) {
  const modules = path.join(ROOT, 'node_modules')
  if (!fs.existsSync(modules)) {
    throw new ReleaseError('checking generated files needs the repository dependencies: run `npm install`')
  }
  const work = makeTempDir('generated', options)
  for (const dir of ['build', 'lib']) {
    fs.cpSync(path.join(ROOT, dir), path.join(work, dir), { recursive: true })
  }
  // A junction needs no extra privileges on Windows; ignored elsewhere.
  const link = path.join(work, 'node_modules')
  fs.symlinkSync(modules, link, 'junction')
  const stale = []
  try {
    for (const [file, script] of Object.entries(GENERATED)) {
      await run(process.execPath, [path.join(work, script)], { cwd: work, env: cleanEnv() })
      const read = dir => normalize(fs.readFileSync(path.join(dir, file), 'utf8'))
      if (read(work) !== read(ROOT)) stale.push(file)
    }
  } finally {
    // Unlink first, so that no recursive delete can ever follow it.
    fs.unlinkSync(link)
  }
  if (stale.length > 0) {
    throw new ReleaseError(
      `generated files are out of date: ${stale.join(', ')}\n` +
      'They differ from what the installed dependencies generate. Run `npm install`,\n' +
      'then `npm run build:validation`, review the diff, and commit it.'
    )
  }
}

module.exports = { checkGenerated, normalize }
