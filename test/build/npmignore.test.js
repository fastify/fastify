'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

const root = path.join(__dirname, '..', '..')

// npm ignores .gitignore entirely once a .npmignore exists, so anything listed
// only in .gitignore ends up published. Agent scratch directories are the ones
// that keep getting added to .gitignore alone.
function readSection (file, header) {
  const lines = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/)
  const start = lines.indexOf(header)

  if (start === -1) {
    throw new Error(`${file} no longer has a "${header}" section`)
  }

  const patterns = []

  for (const line of lines.slice(start + 1)) {
    const entry = line.trim()

    if (entry === '') {
      break
    }

    if (!entry.startsWith('#')) {
      patterns.push(entry.replace(/\/$/, ''))
    }
  }

  return patterns
}

test('.npmignore ignores every agent file .gitignore ignores', t => {
  const gitignored = readSection('.gitignore', '# Agents files')
  const npmignored = new Set(readSection('.npmignore', '# AI files'))

  t.plan(gitignored.length)

  for (const pattern of gitignored) {
    t.assert.ok(
      npmignored.has(pattern),
      `"${pattern}" is in .gitignore but not in the "# AI files" section of .npmignore, so it would be published`
    )
  }
})
