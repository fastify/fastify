#!/usr/bin/env node
'use strict'

// The release gate. See RELEASING.md.
/* c8 ignore start */

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { parseArgs } = require('node:util')
const { execFileSync } = require('node:child_process')
const { checkContents, readTarball, sha256 } = require('./package-contents')
const { killAll, npm } = require('./run')
const scenarios = require('./consumers')

const root = path.join(__dirname, '..', '..')

const HELP = `Usage: npm run release:check -- [options]

  --out <dir>        keep the packed tarball in <dir>
  --tarball <file>   check an existing tarball instead of packing one
  --sha256 <hex>     fail unless the tarball has this digest
  --require-clean    fail unless every published file is committed and unchanged
  --only <names>     comma separated scenarios (partial run, not enough to release)
                     ${Object.keys(scenarios).join(', ')}; "none" for contents only
  --keep             keep the consumer projects for debugging
`

function git (...args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null // not a git checkout
  }
}

function selectScenarios (only) {
  const all = Object.keys(scenarios)
  if (only === undefined) return all
  if (only === 'none') return []
  const names = only.split(',')
  const unknown = names.filter((name) => !all.includes(name))
  if (unknown.length) throw new Error(`unknown scenario "${unknown.join(', ')}"; choose from: ${all.join(', ')}, none`)
  return names
}

// A parent node_modules would let a consumer find packages it did not install.
function assertIsolated (dir) {
  for (let current = dir; current !== path.dirname(current); current = path.dirname(current)) {
    const candidate = path.join(current, 'node_modules')
    if (fs.existsSync(candidate)) {
      throw new Error(`${candidate} would leak into the consumer projects; set TMPDIR (TEMP on Windows) to a directory without one`)
    }
  }
  const fromRoot = path.relative(fs.realpathSync(root), dir)
  if (!fromRoot.startsWith('..') && !path.isAbsolute(fromRoot)) {
    throw new Error('the temporary directory is inside the repository; set TMPDIR (TEMP on Windows) elsewhere')
  }
}

function assertCommitted (files) {
  const status = git('status', '--porcelain')
  if (status === null) throw new Error('--require-clean needs a git checkout')
  if (status.trim()) throw new Error(`the working tree has uncommitted changes; commit or stash them:\n${status}`)
  const tracked = new Set(git('ls-files', '-z').split('\0'))
  const untracked = [...files.keys()].filter((file) => !tracked.has(file))
  if (untracked.length) throw new Error(`these files would be published but are not in git: ${untracked.join(', ')}`)
}

async function pack (destination) {
  fs.mkdirSync(destination, { recursive: true })
  const { name, version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const tarball = path.join(destination, `${name}-${version}.tgz`)
  fs.rmSync(tarball, { force: true })
  await npm(['pack', '--ignore-scripts', '--pack-destination', destination], { cwd: root })
  return tarball
}

function report (title, detail) {
  console.error(`\n✖ ${title}\n${detail.replace(/^/gm, '    ')}`)
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::error title=Release gate::${title}: ${detail.split('\n')[0]}`)
  }
}

async function main (argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      out: { type: 'string' },
      tarball: { type: 'string' },
      sha256: { type: 'string' },
      only: { type: 'string' },
      'require-clean': { type: 'boolean' },
      keep: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }
    }
  })
  if (values.help) return console.log(HELP)
  if (values.out && values.tarball) throw new Error('--out and --tarball cannot be combined')
  const selected = selectScenarios(values.only)

  const before = git('status', '--porcelain')
  const workDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fastify-release-')))
  const cleanup = () => {
    if (!values.keep) fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 3 })
  }
  const interrupt = () => {
    killAll()
    cleanup()
    process.exit(130)
  }
  process.once('SIGINT', interrupt)
  process.once('SIGTERM', interrupt)

  const failed = []
  try {
    assertIsolated(workDir)
    const tarball = values.tarball
      ? path.resolve(values.tarball)
      : await pack(values.out ? path.resolve(values.out) : path.join(workDir, 'pack'))
    const digest = sha256(fs.readFileSync(tarball))
    if (values.sha256 !== undefined && values.sha256 !== digest) {
      throw new Error(`sha256 mismatch for ${tarball}\nexpected ${values.sha256}\nactual   ${digest}\n` +
        'This is not the artifact that was packed. Do not publish it.')
    }
    console.log(`Checking ${path.basename(tarball)} on Node.js ${process.version} (${process.platform})\nsha256 ${digest}\n`)

    const files = readTarball(tarball)
    if (values['require-clean']) assertCommitted(files)
    const problems = checkContents(files, root)
    if (problems.length) {
      failed.push('contents')
      report('contents', problems.join('\n'))
    } else {
      console.log(`✔ contents (${files.size} files)`)
    }

    const context = { tarball, files, workDir, version: JSON.parse(files.get('package.json')).version }
    for (const name of selected) {
      const start = Date.now()
      try {
        await scenarios[name](context)
        console.log(`✔ ${name} (${((Date.now() - start) / 1000).toFixed(1)}s)`)
      } catch (error) {
        failed.push(name)
        report(name, `${error.message}\nReproduce: npm run release:check -- --only ${name} --keep\n` +
          '(install errors such as ENOTFOUND or ETIMEDOUT mean the npm registry was unreachable)')
      }
    }

    if (sha256(fs.readFileSync(tarball)) !== digest) throw new Error('the tarball changed while it was being checked')
    if (values.out && process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `tarball=${path.basename(tarball)}\nsha256=${digest}\n`)
    }
  } finally {
    if (values.keep) console.log(`\nConsumer projects kept in ${workDir}`)
    cleanup()
    process.removeListener('SIGINT', interrupt)
    process.removeListener('SIGTERM', interrupt)
  }

  // --out may legitimately create an ignored tarball; anything else is a bug.
  const after = git('status', '--porcelain')
  if (after !== before) throw new Error(`the release gate changed the working tree:\n${after}`)

  if (failed.length) throw new Error(`failed: ${failed.join(', ')}. Do not publish.`)
  console.log(values.only === undefined
    ? '\nRelease gate passed for this Node.js version and OS.'
    : '\nPartial run passed. This is not enough to release.')
}

main(process.argv.slice(2)).catch((error) => {
  report('release gate', error.message)
  process.exitCode = 1
})
/* c8 ignore stop */
