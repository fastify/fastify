'use strict'

/* c8 ignore start */

const { spawn } = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..', '..')
const TIMEOUT = 10 * 60 * 1000

// An error that is the user's to fix: printed without a stack trace.
class ReleaseError extends Error {
  name = 'ReleaseError'
}

// `npm run` exports the repository's .npmrc (ignore-scripts, min-release-age,
// package-lock) as environment variables. A downstream project never sees them,
// so only settings needed to reach a registry are passed on.
const KEPT_NPM_CONFIG = new Set([
  'registry', 'cafile', 'ca', 'proxy', 'https_proxy', 'noproxy', 'strict_ssl',
  'userconfig', 'globalconfig', 'cache'
])

function cleanEnv (source = process.env) {
  const env = {}
  for (const [key, value] of Object.entries(source)) {
    const npmKey = /^npm_config_(.*)$/i.exec(key)?.[1].toLowerCase()
    // Keys such as `npm_config_//host/:_authToken` carry credentials.
    if (npmKey !== undefined && !KEPT_NPM_CONFIG.has(npmKey) && !npmKey.startsWith('//')) continue
    if (/^(?:NODE_PATH|NODE_OPTIONS|NODE_TEST_CONTEXT|INIT_CWD)$/i.test(key)) continue
    env[key] = value
  }
  return env
}

function withNodeOnPath (env, node) {
  const key = Object.keys(env).find(name => name.toUpperCase() === 'PATH') || 'PATH'
  return { ...env, [key]: `${path.dirname(node)}${path.delimiter}${env[key] || ''}` }
}

const children = new Set()

function run (command, args, options = {}) {
  const { cwd = ROOT, env = cleanEnv(), timeout = TIMEOUT, inherit = false } = options
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'] })
    children.add(child)
    let stdout = ''
    let output = ''
    let timedOut = false
    child.stdout?.setEncoding('utf8').on('data', chunk => { stdout += chunk; output += chunk })
    child.stderr?.setEncoding('utf8').on('data', chunk => { output += chunk })
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL') }, timeout)
    const fail = reason => {
      const tail = output.trim().split('\n').slice(-40).join('\n')
      reject(new ReleaseError([
        `command ${reason}: ${[command, ...args].join(' ')}`,
        `  in: ${cwd}`,
        tail
      ].join('\n').trimEnd()))
    }
    child.on('error', error => {
      clearTimeout(timer)
      children.delete(child)
      fail(`could not start (${error.message})`)
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      children.delete(child)
      if (code === 0) return resolve(stdout)
      fail(timedOut ? `timed out after ${timeout / 1000}s` : `failed (${signal || `exit ${code}`})`)
    })
  })
}

// Locating npm-cli.js avoids spawning `npm.cmd` through a shell on Windows.
function npmCli () {
  // Next to the running Node.js first, then wherever `npm` on PATH lives
  // (Homebrew and some version managers keep the two apart).
  const onPath = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  const candidates = [process.env.npm_execpath]
  for (const dir of [path.dirname(process.execPath), ...onPath]) {
    const shim = path.join(dir, 'npm')
    candidates.push(
      // On unix `npm` is a symlink to npm-cli.js.
      fs.existsSync(shim) ? fs.realpathSync(shim) : undefined,
      path.join(dir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
      path.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js')
    )
  }
  const found = candidates.find(file => file && path.basename(file) === 'npm-cli.js' && fs.existsSync(file))
  if (!found) throw new ReleaseError('could not locate npm-cli.js; run this through `npm run`')
  return found
}

function npm (args, options = {}) {
  return run(options.node || process.execPath, [npmCli(), ...args], options)
}

const temporary = new Set()
let cleanupInstalled = false

function removeTemporary () {
  for (const child of children) child.kill('SIGKILL')
  for (const dir of temporary) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    } catch (error) {
      process.stderr.write(`warning: could not remove ${dir}: ${error.message}\n`)
    }
  }
  temporary.clear()
}

function makeTempDir (label, { keep = false } = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `fastify-${label}-`)))
  // Module resolution walks upwards. A consumer project below the repository, or
  // below any node_modules, could be satisfied by files that are not published.
  for (let current = dir; current !== path.dirname(current); current = path.dirname(current)) {
    if (current === fs.realpathSync(ROOT) || fs.existsSync(path.join(current, 'node_modules'))) {
      fs.rmSync(dir, { recursive: true, force: true })
      throw new ReleaseError(`temporary directory ${dir} is not isolated: ${current} ` +
        'is the repository or contains node_modules. Point TMPDIR somewhere else.')
    }
  }
  if (keep) {
    process.stdout.write(`keeping temporary directory ${dir}\n`)
    return dir
  }
  if (!cleanupInstalled) {
    cleanupInstalled = true
    process.on('exit', removeTemporary)
    for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 129]]) {
      process.on(signal, () => process.exit(code))
    }
  }
  temporary.add(dir)
  return dir
}

function integrity (buffer) {
  return `sha512-${crypto.createHash('sha512').update(buffer).digest('base64')}`
}

function listFiles (dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' || entry.name === '.git' ? [] : listFiles(full, base)
    }
    return [path.relative(base, full).split(path.sep).join('/')]
  }).sort()
}

// Content hashes of the working tree, to prove the gate did not touch it.
function snapshotTree (dir) {
  return new Map(listFiles(dir).map(file => {
    const full = path.join(dir, file)
    const content = fs.lstatSync(full).isSymbolicLink() ? fs.readlinkSync(full) : fs.readFileSync(full)
    return [file, integrity(content)]
  }))
}

function diffSnapshots (before, after) {
  const changes = []
  for (const [file, hash] of after) {
    if (!before.has(file)) changes.push(`created ${file}`)
    else if (before.get(file) !== hash) changes.push(`modified ${file}`)
  }
  for (const file of before.keys()) {
    if (!after.has(file)) changes.push(`deleted ${file}`)
  }
  return changes
}

function readJson (file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    throw new ReleaseError(`cannot read ${file}: ${error.message}`)
  }
}

module.exports = {
  ROOT,
  ReleaseError,
  cleanEnv,
  withNodeOnPath,
  run,
  npm,
  makeTempDir,
  integrity,
  listFiles,
  snapshotTree,
  diffSnapshots,
  readJson
}
