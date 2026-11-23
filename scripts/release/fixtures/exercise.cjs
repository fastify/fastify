'use strict'

// Runs inside a downstream project, against the installed package (or a bundle
// of it). It must only depend on fastify and Node.js.

const assert = require('node:assert')

module.exports = async function exercise (Fastify, named) {
  assert.strictEqual(typeof Fastify, 'function', 'the default export is not a function')
  assert.strictEqual(named.fastify, Fastify, 'the named export "fastify" differs from the default export')
  assert.strictEqual(typeof named.errorCodes.FST_ERR_VALIDATION, 'function', '"errorCodes" is not exported')
  assert.strictEqual(typeof named.LogController, 'function', '"LogController" is not exported')

  const logs = []
  const app = Fastify({ logger: { stream: { write: (line) => logs.push(line) } } })
  assert.strictEqual(app.version, process.env.EXPECTED_VERSION)

  // Checks the version range a plugin declares, like fastify-plugin does.
  const plugin = async (instance) => { instance.decorate('greeting', 'hello') }
  plugin[Symbol.for('skip-override')] = true
  plugin[Symbol.for('plugin-meta')] = { fastify: `${process.env.EXPECTED_VERSION.split('.')[0]}.x` }
  app.register(plugin)

  app.post('/echo', {
    schema: {
      body: { type: 'object', required: ['n'], properties: { n: { type: 'integer' } } },
      response: { 200: { type: 'object', properties: { n: { type: 'integer' }, greeting: { type: 'string' } } } }
    }
  }, async (request) => ({ n: request.body.n, greeting: app.greeting, hidden: true }))

  const address = await app.listen({ port: 0, host: '127.0.0.1' })
  try {
    const post = (body) => fetch(`${address}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', connection: 'close' },
      body
    })
    const ok = await post('{"n":"42"}')
    assert.strictEqual(ok.status, 200)
    assert.deepStrictEqual(await ok.json(), { n: 42, greeting: 'hello' })

    const invalid = await post('{}')
    assert.strictEqual(invalid.status, 400)
    assert.strictEqual((await invalid.json()).code, 'FST_ERR_VALIDATION')

    const injected = await app.inject({ method: 'GET', url: '/missing' })
    assert.strictEqual(injected.statusCode, 404)
  } finally {
    await app.close()
  }
  assert.ok(logs.some((line) => line.includes('incoming request')), 'nothing was logged')
}
