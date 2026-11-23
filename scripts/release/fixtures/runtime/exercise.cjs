'use strict'

/* c8 ignore start */

// Behaviour every consumption mode must deliver. Runs inside a consumer project
// (or a bundle of one), against the installed artifact.

const assert = require('node:assert')
const { Writable } = require('node:stream')
const fp = require('fastify-plugin')

module.exports = async function exercise ({ fastify, errorCodes, LogController }) {
  const expected = process.env.FASTIFY_EXPECTED_VERSION
  assert.strictEqual(typeof fastify, 'function')
  assert.strictEqual(typeof errorCodes.FST_ERR_NOT_FOUND, 'function')
  assert.strictEqual(typeof LogController, 'function')

  // Loads pino and runs the precompiled options validator.
  let logged = ''
  const stream = new Writable({ write (chunk, _, done) { logged += chunk; done() } })
  const app = fastify({ logger: { level: 'info', stream }, bodyLimit: 2048 })
  assert.strictEqual(app.version, expected, 'fastify.version must match the published version')
  assert.strictEqual(app.initialConfig.bodyLimit, 2048)

  app.register(fp(async instance => {
    instance.decorate('greeting', 'hello')
  }, { name: 'greeting', fastify: `${expected.split('.')[0]}.x` }))

  app.post('/echo', {
    schema: {
      body: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } }
    }
  }, async function (request) {
    return { message: `${this.greeting} ${request.body.name}`, secret: 'must be stripped' }
  })
  app.get('/boom', async () => { throw new Error('boom') })

  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 })
    const post = body => fetch(`${address}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', connection: 'close' },
      body: JSON.stringify(body)
    })

    const ok = await post({ name: 'consumer' })
    assert.strictEqual(ok.status, 200)
    assert.deepStrictEqual(await ok.json(), { message: 'hello consumer' })

    const invalid = await post({})
    assert.strictEqual(invalid.status, 400)
    assert.strictEqual((await invalid.json()).code, 'FST_ERR_VALIDATION')

    // The precompiled error serializer, through inject (light-my-request).
    const boom = await app.inject('/boom')
    assert.strictEqual(boom.statusCode, 500)
    assert.deepStrictEqual(boom.json(), { statusCode: 500, error: 'Internal Server Error', message: 'boom' })
    assert.strictEqual((await app.inject('/missing')).statusCode, 404)
  } finally {
    await app.close()
  }
  assert.match(logged, /"msg":"incoming request"/)

  const mismatched = fastify()
  mismatched.register(fp(async () => {}, { fastify: '1.x' }))
  await assert.rejects(async () => { await mismatched.ready() }, { code: 'FST_ERR_PLUGIN_VERSION_MISMATCH' })
}
