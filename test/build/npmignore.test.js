'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

// npm ignores .gitignore entirely once a .npmignore exists, so a pattern added
// only to .gitignore is still published — that is how `.pi` shipped in 5.12.1.
function patterns (file) {
  return fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8')
    .split('\n')
    .map((line) => line.trim().replace(/\/$/, ''))
}

test('.npmignore ignores every agent file .gitignore ignores', (t) => {
  const gitignore = patterns('.gitignore')
  const start = gitignore.indexOf('# Agents files')
  t.assert.notStrictEqual(start, -1, '.gitignore no longer has an "# Agents files" section')

  const agentFiles = gitignore.slice(start + 1).filter((line) => line && !line.startsWith('#'))
  const npmignored = new Set(patterns('.npmignore'))

  t.assert.deepStrictEqual(
    agentFiles.filter((pattern) => !npmignored.has(pattern)),
    [],
    'listed in the "# Agents files" section of .gitignore but not in .npmignore, so npm would publish them'
  )
})
