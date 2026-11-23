'use strict'

/* c8 ignore start */

const fs = require('node:fs')
const path = require('node:path')
const { setTimeout: sleep } = require('node:timers/promises')
const policy = require('./policy')
const { assertValidPackage, gitState } = require('./pack')
const { ReleaseError, ROOT, cleanEnv, npm, readJson } = require('./util')

function writeReceipt (dir, receipt) {
  fs.mkdirSync(dir, { recursive: true })
  const major = receipt.node.split('.')[0]
  const file = path.join(dir, `receipt-${receipt.platform}-node${major}.json`)
  fs.writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`)
}

function readReceipts (dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(file => /^receipt-.*\.json$/.test(file))
    .map(file => readJson(path.join(dir, file)))
}

// Every supported platform and Node.js major must have passed every scenario
// against exactly these bytes.
function missingValidation (artifact, receipts, platforms) {
  const missing = []
  for (const platform of platforms) {
    for (const major of policy.NODE_VERSIONS) {
      const matching = receipts.filter(receipt =>
        receipt.platform === platform &&
        Number(String(receipt.node).split('.')[0]) === major)
      const current = matching.filter(receipt => receipt.integrity === artifact.integrity)
      const complete = current.some(receipt =>
        receipt.failures?.length === 0 &&
        policy.SCENARIOS.every(scenario => receipt.passed?.includes(scenario)))
      if (complete) continue
      let reason = 'no validation receipt'
      if (current.length > 0) reason = 'validation failed or was incomplete'
      else if (matching.length > 0) reason = 'receipt is for a different tarball'
      missing.push(`${platform} / Node.js ${major}: ${reason}`)
    }
  }
  return missing
}

async function assertReleasableCheckout (artifact, { sourceDir = ROOT, dryRun = false } = {}) {
  const { commit, dirty } = await gitState(sourceDir)
  const problems = []
  if (commit === null) {
    problems.push('not a git checkout, so the artifact cannot be tied to a commit')
  } else {
    if (dirty.length > 0) problems.push(`uncommitted changes:\n      ${dirty.join('\n      ')}`)
    if (artifact && artifact.commit !== commit) {
      problems.push(`artifact was packed from ${artifact.commit}, but HEAD is ${commit}`)
    }
  }
  if (problems.length === 0) return
  const message = `the checkout is not releasable:\n${problems.map(p => `  - ${p}`).join('\n')}`
  if (!dryRun) throw new ReleaseError(message)
  process.stdout.write(`warning (a real publish would stop here): ${message}\n`)
}

// Confirms that what the registry now serves is what was validated.
async function confirmPublished (artifact, { attempts = 10, delay = 6000, view } = {}) {
  const lookup = view || (() => npm(['view', `${artifact.name}@${artifact.version}`, 'dist.integrity', '--prefer-online'],
    { cwd: path.dirname(artifact.tarball) }))
  let lastError = 'the registry returned nothing'
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(delay)
    let published
    try {
      published = (await lookup()).trim()
    } catch (error) {
      lastError = error.message
      continue
    }
    if (published === artifact.integrity) return
    if (published) {
      throw new ReleaseError(`REGISTRY MISMATCH for ${artifact.name}@${artifact.version}\n` +
        `  validated ${artifact.integrity}\n  published ${published}\n` +
        'Deprecate this version and investigate before releasing again.')
    }
  }
  throw new ReleaseError(`${artifact.name}@${artifact.version} was published, but its integrity could ` +
    'not be confirmed. Do NOT publish again; compare manually with\n' +
    `  npm view ${artifact.name}@${artifact.version} dist.integrity\n` +
    `  expected ${artifact.integrity}\n${lastError}`)
}

async function publish (artifact, options) {
  const { receiptsDir, platforms, dryRun, tag, otp, provenance, sourceDir = ROOT } = options
  await assertReleasableCheckout(artifact, { sourceDir, dryRun })
  assertValidPackage(artifact.buffer, sourceDir)
  const missing = missingValidation(artifact, readReceipts(receiptsDir), platforms)
  if (missing.length > 0) {
    throw new ReleaseError(`refusing to publish, the artifact is not fully validated:\n${missing.map(m => `  - ${m}`).join('\n')}`)
  }
  // Publishing the tarball path uploads these exact bytes; nothing is repacked.
  const args = ['publish', artifact.tarball, '--ignore-scripts']
  if (dryRun) args.push('--dry-run')
  if (tag) args.push('--tag', tag)
  if (otp) args.push('--otp', otp)
  if (provenance) args.push('--provenance')
  // Inherit the terminal so npm can prompt for two-factor authentication.
  await npm(args, { cwd: path.dirname(artifact.tarball), env: cleanEnv(), inherit: true })
  if (!dryRun) await confirmPublished(artifact)
}

module.exports = {
  publish,
  writeReceipt,
  readReceipts,
  missingValidation,
  assertReleasableCheckout,
  confirmPublished
}
