'use strict'

const Fastify = require('../fastify')

const message = '中文日志测试：你好，世界！'
const defaultLogger = Fastify({ logger: true })
const stdoutLogger = Fastify({ logger: { stream: process.stdout } })

const run = (label) => {
  console.log(`\n--- ${label} ---`)
  console.log('[console]', message)
  defaultLogger.log.info({ source: 'fastify-default' }, message)
  stdoutLogger.log.info({ source: 'fastify-stdout' }, message)
}

// output before switching the code page.
// On Windows with the default GBK (936) code page,
// fastify-default produces garbled Chinese while fastify-stdout is fine.
run('before chcp 65001')

// Switch the Windows console code page to UTF-8 and run again for comparison.
if (process.platform === 'win32') {
  const { execSync } = require('node:child_process')
  try {
    execSync('chcp 65001', { stdio: 'ignore' })
    run('after chcp 65001')
  } catch (e) {
    console.error(e)
  }
}

Promise.all([defaultLogger.close(), stdoutLogger.close()]).catch(err => {
  console.error(err)
  process.exitCode = 1
})
