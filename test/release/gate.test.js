'use strict'

// Keeps the wiring of the release gate from drifting. The consumer scenarios
// themselves need the network and run through `npm run release:check`.

const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.join(__dirname, '..', '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const script = (name, ...args) => spawnSync(process.execPath, [path.join(root, 'scripts', 'release', name), ...args], { encoding: 'utf8' })

function job (workflow, name) {
  const match = new RegExp(`^  ${name}:\\n((?:(?: {4}.*)?\\n)+)`, 'm').exec(read(`.github/workflows/${workflow}`) + '\n')
  if (!match) throw new Error(`job "${name}" not found in ${workflow}`)
  return match[1]
}

test('the gate covers the same Node.js versions and OSes as the unit tests', (t) => {
  for (const key of ['node-version', 'os']) {
    const pattern = new RegExp(`^ +${key}: (\\[.*\\])$`, 'm')
    t.assert.strictEqual(
      pattern.exec(job('release-gate.yml', 'validate'))[1],
      pattern.exec(job('ci.yml', 'test-unit'))[1]
    )
  }
})

test('publishing depends on the gate and uploads only the validated tarball', (t) => {
  const publish = job('release.yml', 'publish')
  t.assert.match(publish, /needs: gate\n/)
  t.assert.match(publish, /sha256sum --check/)
  t.assert.match(publish, /npm publish "\.\/artifacts\/\$TARBALL"/)
  t.assert.doesNotMatch(publish, /actions\/checkout|always\(\)|continue-on-error/)
  t.assert.match(job('release.yml', 'gate'), /needs: source\n[\s\S]*release-gate\.yml/)
  t.assert.match(job('release-gate.yml', 'validate'), /--tarball .* --sha256 /)
  t.assert.doesNotMatch(job('release-gate.yml', 'validate'), /--only|continue-on-error/)
  t.assert.match(job('ci.yml', 'release-gate'), /release-gate\.yml/)
})

test('publishing a directory is refused when lifecycle scripts run', (t) => {
  t.assert.strictEqual(
    JSON.parse(read('package.json')).scripts.prepublishOnly,
    'node scripts/release/prepublish-guard.js'
  )
  const result = script('prepublish-guard.js')
  t.assert.strictEqual(result.status, 1)
  t.assert.match(result.stderr, /RELEASING\.md/)
})

test('the gate rejects an artifact with another digest, and unknown scenarios', (t) => {
  // Any file will do: the digest is verified before the archive is read.
  const digest = script('check.js', '--tarball', path.join(root, 'package.json'), '--sha256', '0'.repeat(64), '--only', 'none')
  t.assert.strictEqual(digest.status, 1)
  t.assert.match(digest.stderr, /sha256 mismatch/)

  const unknown = script('check.js', '--only', 'nmp')
  t.assert.strictEqual(unknown.status, 1)
  t.assert.match(unknown.stderr, /unknown scenario "nmp"/)
})
