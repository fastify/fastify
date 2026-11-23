#!/usr/bin/env node
'use strict'

// Like `npm run test:validator:integrity`, but puts the committed files back,
// so a failed release check does not leave the repository modified.
/* c8 ignore start */

const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const root = path.join(__dirname, '..', '..')
const GENERATED = {
  'lib/error-serializer.js': 'build/build-error-serializer.js',
  'lib/config-validator.js': 'build/build-validation.js'
}

for (const [file, generator] of Object.entries(GENERATED)) {
  const target = path.join(root, file)
  const committed = fs.readFileSync(target)
  try {
    execFileSync(process.execPath, [path.join(root, generator)], { cwd: root, stdio: 'pipe' })
    if (fs.readFileSync(target, 'utf8').replace(/\s/g, '') !== committed.toString().replace(/\s/g, '')) {
      console.error(`✖ ${file} is out of date: run \`npm run build:validation\`, review the diff and commit it`)
      process.exitCode = 1
    } else {
      console.log(`✔ ${file} is up to date`)
    }
  } finally {
    fs.writeFileSync(target, committed)
  }
}
/* c8 ignore stop */
