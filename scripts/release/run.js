'use strict'

// Process helpers shared by the release gate.
/* c8 ignore start */

const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

const TIMEOUT = 5 * 60 * 1000

// Settings that describe this repository (its .npmrc, or the `npm run` that
// started the gate) and would not apply in a downstream project. Registry,
// proxy, certificate and cache settings are deliberately kept.
const REPOSITORY_ONLY_ENV = /^(npm_package_|npm_lifecycle_|npm_config_(ignore_scripts|min_release_age|package_lock|local_prefix|dry_run|omit|include|save|tag|workspace)|INIT_CWD$|NODE_PATH$)/i

function consumerEnv (extra) {
  const env = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (!REPOSITORY_ONLY_ENV.test(key)) env[key] = value
  }
  return { ...env, ...extra }
}

// Running npm's JavaScript entry point avoids needing a shell for npm.cmd on Windows.
function npmCli () {
  const bin = path.dirname(process.execPath)
  const found = [
    path.join(bin, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(bin, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    /npm-cli\.js$/.test(process.env.npm_execpath) ? process.env.npm_execpath : ''
  ].find((candidate) => candidate && fs.existsSync(candidate))
  return found ? [process.execPath, found] : ['npm']
}

const running = new Set()

function run (command, args, { cwd, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: consumerEnv(env), stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, TIMEOUT)
    running.add(child)
    child.stdout.on('data', (chunk) => { output += chunk })
    child.stderr.on('data', (chunk) => { output += chunk })
    child.on('error', reject)
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      running.delete(child)
      if (code === 0) return resolve(output)
      const reason = timedOut ? `timed out after ${TIMEOUT / 1000}s` : `exited with ${signal || code}`
      reject(new Error([
        `command ${reason}: ${[command, ...args].join(' ')}`,
        `in: ${cwd || process.cwd()}`,
        output.trim().split('\n').slice(-40).join('\n')
      ].join('\n')))
    })
  })
}

function npm (args, options) {
  const [command, ...prefix] = npmCli()
  return run(command, prefix.concat(args), options)
}

function killAll () {
  for (const child of running) child.kill('SIGKILL')
}

module.exports = { consumerEnv, killAll, npm, run }
/* c8 ignore stop */
