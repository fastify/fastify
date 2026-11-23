'use strict'

/* c8 ignore start */

const fs = require('node:fs')
const path = require('node:path')
const { inspectPackage, readTarball } = require('./inspect')
const { ReleaseError, ROOT, integrity, npm, readJson, run } = require('./util')

const ARTIFACT_FILE = 'artifact.json'

// The commit and cleanliness of a checkout; nulls when it is not a git checkout.
async function gitState (cwd) {
  if (!fs.existsSync(path.join(cwd, '.git'))) return { commit: null, dirty: null }
  const commit = (await run('git', ['rev-parse', 'HEAD'], { cwd })).trim()
  const status = (await run('git', ['status', '--porcelain'], { cwd })).trim()
  return { commit, dirty: status === '' ? [] : status.split('\n') }
}

function assertValidPackage (buffer, sourceDir) {
  const problems = inspectPackage(readTarball(buffer), sourceDir)
  if (problems.length > 0) {
    throw new ReleaseError(`the packed artifact is not releasable:\n${problems.map(p => `  - ${p}`).join('\n')}`)
  }
}

// npm <= 11 prints an array; npm 12 prints an object keyed by package name.
function parsePackOutput (output) {
  const result = Object.values(JSON.parse(output))
  if (result.length !== 1 || typeof result[0]?.filename !== 'string') {
    throw new ReleaseError(`unrecognized \`npm pack --json\` output:\n${output.slice(0, 500)}`)
  }
  return result[0]
}

// Packs `sourceDir` into `outDir`, validates the result and records its identity.
async function pack (outDir, { sourceDir = ROOT } = {}) {
  fs.mkdirSync(outDir, { recursive: true })
  // --ignore-scripts: nothing may rewrite sources between checkout and tarball.
  const output = await npm(
    ['pack', '--json', '--ignore-scripts', '--pack-destination', path.resolve(outDir)],
    { cwd: sourceDir }
  )
  const { filename, name, version } = parsePackOutput(output)
  const buffer = fs.readFileSync(path.join(outDir, filename))
  assertValidPackage(buffer, sourceDir)
  const artifact = {
    name,
    version,
    filename,
    integrity: integrity(buffer),
    commit: (await gitState(sourceDir)).commit,
    files: [...readTarball(buffer).keys()].sort()
  }
  fs.writeFileSync(path.join(outDir, ARTIFACT_FILE), `${JSON.stringify(artifact, null, 2)}\n`)
  return artifact
}

// Loads a previously packed artifact and refuses it if the bytes have changed.
function loadArtifact (dir) {
  const artifact = readJson(path.join(dir, ARTIFACT_FILE))
  if (typeof artifact.filename !== 'string' || path.basename(artifact.filename) !== artifact.filename) {
    throw new ReleaseError(`${ARTIFACT_FILE} has an invalid "filename"`)
  }
  const tarball = path.resolve(dir, artifact.filename)
  if (!fs.existsSync(tarball)) throw new ReleaseError(`artifact tarball is missing: ${tarball}`)
  const buffer = fs.readFileSync(tarball)
  const actual = integrity(buffer)
  if (actual !== artifact.integrity) {
    throw new ReleaseError(`${tarball} is not the packed artifact\n  expected ${artifact.integrity}\n  actual   ${actual}`)
  }
  return { ...artifact, tarball, buffer }
}

module.exports = { pack, parsePackOutput, loadArtifact, assertValidPackage, gitState }
