'use strict'

const assert = require('node:assert/strict')
const { execFile } = require('node:child_process')
const { once } = require('node:events')
const { request } = require('node:http')
const { connect, constants } = require('node:http2')
const { setImmediate: immediate } = require('node:timers/promises')
const { promisify } = require('node:util')
const Fastify = require('..')

// Run with --expose-gc in a fresh process to isolate Error.prepareStackTrace.
// Reading the default reason.stack before GC would hide the lazy-stack leak.
if (process.argv[2] === 'gc-child') {
  checkCollection(process.argv[3]).catch(error => {
    console.error(error)
    process.exitCode = 1
  })
} else {
  const { test } = require('node:test')
  const run = promisify(execFile)
  for (const scenario of ['http1', 'http2', 'http2-custom-stack']) {
    test(`retained aborted signal releases Request and Reply (${scenario})`, { timeout: 10000 }, async () => {
      await run(process.execPath, ['--expose-gc', __filename, 'gc-child', scenario], { timeout: 8000 })
    })
  }
}

async function checkCollection (scenario) {
  const retained = await disconnect(scenario)
  assert.equal(retained.signal.aborted, true)
  const reason = retained.signal.reason
  assert.equal(reason.name, 'AbortError')
  assert.equal(reason.message, 'This operation was aborted')
  assert.equal(reason.code, 20)
  assert.equal(reason instanceof DOMException, true)
  assert.equal(reason instanceof Error, true)
  assert.equal(retained.prepared, 0)
  // Holding signal/reason and both raw objects must not retain framework objects.
  // Do not read the default stack: formatting it would conceal a lazy-stack leak.
  let collected = false
  for (let attempt = 0; attempt < 30; attempt++) {
    await immediate()
    global.gc()
    if (!retained.request.deref() && !retained.reply.deref()) {
      collected = true
      break
    }
  }
  assert.equal(collected, true)
  if (scenario === 'http2-custom-stack') assert.equal(reason.stack, 'user stack')
}

async function disconnect (scenario) {
  const http2 = scenario.startsWith('http2')
  const retained = { prepared: 0 }
  const closed = Promise.withResolvers()
  function respond (req, reply) {
    retained.request = new WeakRef(req)
    retained.reply = new WeakRef(reply)
    retained.rawRequest = req.raw
    retained.rawResponse = reply.raw
    retained.signal = req.signal
    if (scenario === 'http2-custom-stack') {
      req.signal.addEventListener('abort', function () { this.reason.stack = 'user stack' }, { once: true })
    }
    reply.raw.once('finish', () => { retained.finished = true })
    reply.raw.once('close', () => closed.resolve())
    if (http2) reply.raw.end(Buffer.alloc(16 * 1024 * 1024))
    else reply.raw.write('chunk')
  }
  const app = Fastify({ http2 })
  app.get('/:id', respond)
  let client
  let session
  const original = Error.prepareStackTrace
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 })
    if (http2) {
      session = connect(address)
      client = session.request({ ':path': '/valid' })
    } else client = request(address + '/valid')
    client.on('error', () => {})
    const received = once(client, 'response')
    client.end()
    const [res] = await received
    const body = http2 ? client : res
    body.on('error', () => {})
    await once(body, 'data')
    Error.prepareStackTrace = error => {
      // Node may format independent transport errors such as EPIPE on close.
      // Formatting the new cancellation reason inside Fastify is the regression.
      if (error.name === 'AbortError') {
        retained.prepared++
        throw new Error('AbortError stack must remain lazy')
      }
      return error.name + ': ' + error.message
    }
    if (http2) client.close(constants.NGHTTP2_CANCEL)
    else client.destroy()
    await closed.promise
    if (http2) {
      assert.equal(retained.finished, true)
      assert.equal(retained.rawRequest.aborted, false)
      assert.equal(retained.rawResponse.writableFinished, false)
    }
  } finally {
    Error.prepareStackTrace = original
    client?.destroy()
    session?.destroy()
    await app.close()
  }
  return retained
}
