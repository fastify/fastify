'use strict'

/* c8 ignore start */

const fs = require('node:fs')
const path = require('node:path')
const { parseArgs } = require('node:util')
const policy = require('./policy')
const { checkGenerated } = require('./generated')
const { nodeVersion, resolveNodes } = require('./nodes')
const { pack, loadArtifact } = require('./pack')
const { assertReleasableCheckout, publish, writeReceipt } = require('./publish')
const { installTools, verify } = require('./verify')
const {
  ReleaseError, ROOT, diffSnapshots, makeTempDir, npm, snapshotTree, cleanEnv
} = require('./util')

const USAGE = `Usage: node scripts/release/cli.js <command> [options]

  check      Run the whole gate: generated files, pack, inspect, and consume the
             tarball on every supported Node.js version. Nothing is published.
               --node <majors>      e.g. 22 or 20,24 (partial; cannot publish)
               --node-path <bin>    use this Node.js binary (repeatable)
               --out <dir>          keep the tarball and receipts (outside the repo)
  pack       Pack and statically inspect the tarball.   --out <dir>
  verify     Consume a packed tarball on the running Node.js.
               --artifact <dir>  [--receipts <dir>]
  generated  Check that generated files in lib/ are up to date.
  publish    Publish a validated tarball.
               --artifact <dir>     from \`pack\`, with receipts; without it the
                                    full test suite and \`check\` run first
               --receipts <dir>     default: the artifact directory
               --platforms <list>   required receipt platforms
               --tag <tag>  --otp <code>  --provenance  --dry-run

  --keep     Keep temporary consumer projects for debugging.
`

const OPTIONS = {
  check: ['node', 'node-path', 'out', 'keep'],
  pack: ['out'],
  verify: ['artifact', 'receipts', 'keep'],
  generated: ['keep'],
  publish: ['artifact', 'receipts', 'platforms', 'tag', 'otp', 'provenance', 'dry-run', 'node-path', 'keep']
}

function parse (argv) {
  const [command, ...rest] = argv
  if (!Object.hasOwn(OPTIONS, command)) {
    throw new ReleaseError(`${command ? `unknown command '${command}'` : 'missing command'}\n\n${USAGE}`)
  }
  const definitions = Object.fromEntries(OPTIONS[command].map(name => [name, {
    type: ['keep', 'provenance', 'dry-run'].includes(name) ? 'boolean' : 'string',
    multiple: name === 'node-path'
  }]))
  try {
    return { command, values: parseArgs({ args: rest, options: definitions, strict: true }).values }
  } catch (error) {
    throw new ReleaseError(`${error.message}\n\n${USAGE}`)
  }
}

// `npm run release:publish --dry-run` (without `--`) hands the flag to npm, not
// to us. Honor it, rather than publishing for real.
function withNpmFlags (values, env = process.env) {
  const merged = { ...values }
  if (env.npm_config_dry_run === 'true') merged['dry-run'] = true
  if (env.npm_config_tag && env.npm_config_tag !== 'latest') merged.tag ??= env.npm_config_tag
  if (env.npm_config_otp) merged.otp ??= env.npm_config_otp
  return merged
}

function outputDir (dir) {
  const resolved = path.resolve(dir)
  const relative = path.relative(ROOT, resolved)
  if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
    throw new ReleaseError(`${resolved} is inside the repository; choose a directory outside it`)
  }
  // Old receipts or tarballs must never be mistaken for this run's.
  if (fs.existsSync(resolved) && fs.readdirSync(resolved).length > 0) {
    throw new ReleaseError(`${resolved} is not empty`)
  }
  return resolved
}

function selectedMajors (value) {
  if (value === undefined) return policy.NODE_VERSIONS
  const majors = value.split(',').map(Number)
  const unsupported = majors.filter(major => !policy.NODE_VERSIONS.includes(major))
  if (unsupported.length > 0) {
    throw new ReleaseError(`unsupported Node.js version(s) ${value}; supported: ${policy.NODE_VERSIONS.join(', ')}`)
  }
  return majors
}

function summarize (receipts) {
  const failed = receipts.flatMap(receipt => receipt.failures.map(failure =>
    `  - Node.js ${receipt.node} on ${receipt.platform}: ${failure.name}`))
  if (failed.length > 0) {
    throw new ReleaseError(`${failed.length} scenario(s) failed (details above):\n${failed.join('\n')}\n` +
      'Re-run with --keep to inspect the consumer projects.')
  }
}

async function check (values, dir) {
  const majors = selectedMajors(values.node)
  process.stdout.write('checking generated files\n')
  // Report this together with any consumer failures instead of stopping early.
  const generated = await checkGenerated({ keep: values.keep }).then(() => null, error => error)
  if (generated) process.stdout.write(`  FAIL ${generated.message}\n`)

  process.stdout.write('packing and inspecting the artifact\n')
  await pack(dir)
  const artifact = loadArtifact(dir)
  process.stdout.write(`  ${artifact.filename}: ${artifact.files.length} files\n  ${artifact.integrity}\n`)

  const toolsDir = makeTempDir('tools', { keep: values.keep })
  const nodes = await resolveNodes(majors, { nodePaths: values['node-path'], toolsDir })
  process.stdout.write('installing package managers and bundlers\n')
  await installTools(toolsDir)

  const receipts = []
  for (const node of nodes) {
    const receipt = await verify(artifact, { node, toolsDir, keep: values.keep })
    writeReceipt(dir, receipt)
    receipts.push(receipt)
  }
  if (generated) throw generated
  summarize(receipts)
  const partial = majors.length < policy.NODE_VERSIONS.length
  process.stdout.write(`\nPASS: ${artifact.filename} on Node.js ${nodes.map(n => n.version).join(', ')} ` +
    `(${process.platform})${partial ? '\nThis was a partial run and does not qualify for publishing.' : ''}\n`)
}

const commands = {
  async check (values) {
    const dir = values.out ? outputDir(values.out) : makeTempDir('artifact', { keep: values.keep })
    await check(values, dir)
  },

  async pack (values) {
    if (!values.out) throw new ReleaseError('pack requires --out <dir>')
    const artifact = await pack(outputDir(values.out))
    process.stdout.write(`packed ${artifact.filename} (${artifact.files.length} files)\n${artifact.integrity}\n`)
  },

  async verify (values) {
    if (!values.artifact) throw new ReleaseError('verify requires --artifact <dir>')
    const artifact = loadArtifact(values.artifact)
    const node = await nodeVersion(process.execPath)
    if (!policy.NODE_VERSIONS.includes(node.major)) {
      throw new ReleaseError(`Node.js ${node.version} is not a supported release line (${policy.NODE_VERSIONS.join(', ')})`)
    }
    const toolsDir = makeTempDir('tools', { keep: values.keep })
    await installTools(toolsDir)
    const receipt = await verify(artifact, { node, toolsDir, keep: values.keep })
    if (values.receipts) writeReceipt(path.resolve(values.receipts), receipt)
    summarize([receipt])
    process.stdout.write(`\nPASS: ${artifact.filename} on Node.js ${node.version} (${process.platform})\n`)
  },

  async generated (values) {
    await checkGenerated({ keep: values.keep })
    process.stdout.write('generated files are up to date\n')
  },

  async publish (rawValues) {
    const values = withNpmFlags(rawValues)
    const platforms = values.platforms?.split(',') ||
      (process.env.GITHUB_ACTIONS ? policy.CI_PLATFORMS : [process.platform])
    let dir = values.artifact && path.resolve(values.artifact)
    if (!dir) {
      // Fail fast, before spending minutes on tests.
      await assertReleasableCheckout(null, { dryRun: values['dry-run'] })
      const env = { ...cleanEnv(), PREPUBLISH: 'true' }
      for (const script of ['lint', 'unit', 'test:types']) {
        await npm(['run', script], { env, inherit: true, timeout: 30 * 60 * 1000 })
      }
      dir = makeTempDir('artifact', { keep: values.keep })
      await check({ 'node-path': values['node-path'], keep: values.keep }, dir)
    }
    await publish(loadArtifact(dir), {
      receiptsDir: path.resolve(values.receipts || dir),
      platforms,
      dryRun: values['dry-run'],
      tag: values.tag,
      otp: values.otp,
      provenance: values.provenance
    })
    process.stdout.write(values['dry-run'] ? '\ndry run complete: nothing was published\n' : '\npublished and confirmed\n')
  }
}

async function main (argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(USAGE)
    return
  }
  const { command, values } = parse(argv)
  const before = snapshotTree(ROOT)
  try {
    await commands[command](values)
  } finally {
    const changes = diffSnapshots(before, snapshotTree(ROOT))
    if (changes.length > 0) {
      process.exitCode = 1
      process.stderr.write(`\nerror: the repository changed while \`${command}\` ran:\n  ${changes.join('\n  ')}\n`)
    }
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`\nrelease gate failed: ${error instanceof ReleaseError ? error.message : error.stack}\n`)
    process.exitCode = 1
  })
}

module.exports = { parse, withNpmFlags, outputDir, selectedMajors }
