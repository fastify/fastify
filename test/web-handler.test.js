'use strict'

const { describe, test } = require('node:test')
const Fastify = require('..')

describe('web routes', () => {
  test('web.get returns Response', async (t) => {
    t.plan(2)
    const fastify = new Fastify()

    fastify.web.get('/hello', async (req, ctx) => {
      return new Response('Hello World', { status: 200 })
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/hello'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.body, 'Hello World')
  })

  test('web.post reads JSON body', async (t) => {
    t.plan(2)
    const fastify = new Fastify()

    fastify.web.post('/echo', async (req) => {
      const body = await req.json()
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/echo',
      payload: { hello: 'world' }
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.body), { hello: 'world' })
  })

  test('web.post reads text body', async (t) => {
    t.plan(2)
    const fastify = new Fastify()

    fastify.web.post('/text', async (req) => {
      const body = await req.text()
      return new Response(body.toUpperCase(), { status: 200 })
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/text',
      payload: 'hello world',
      headers: { 'content-type': 'text/plain' }
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.body, 'HELLO WORLD')
  })

  test('web routes run onRequest hook', async (t) => {
    t.plan(2)
    const fastify = new Fastify()
    let hookCalled = false

    fastify.addHook('onRequest', async () => {
      hookCalled = true
    })

    fastify.web.get('/test', async () => new Response('ok'))

    const response = await fastify.inject({
      method: 'GET',
      url: '/test'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.ok(hookCalled)
  })

  test('web routes run onResponse hook', async (t) => {
    t.plan(2)
    const fastify = new Fastify()
    let hookCalled = false

    fastify.addHook('onResponse', async () => {
      hookCalled = true
    })

    fastify.web.get('/test', async () => new Response('ok'))

    const response = await fastify.inject({
      method: 'GET',
      url: '/test'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.ok(hookCalled)
  })

  test('web routes run route-level onRequest hook', async (t) => {
    t.plan(2)
    const fastify = new Fastify()
    let hookCalled = false

    fastify.web.get('/test', {
      onRequest: async () => {
        hookCalled = true
      }
    }, async () => new Response('ok'))

    const response = await fastify.inject({
      method: 'GET',
      url: '/test'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.ok(hookCalled)
  })

  test('web routes handle errors', async (t) => {
    t.plan(1)
    const fastify = new Fastify()

    fastify.web.get('/error', async () => {
      throw new Error('Test error')
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/error'
    })

    t.assert.strictEqual(response.statusCode, 500)
  })

  test('web routes respect prefix', async (t) => {
    t.plan(2)
    const fastify = new Fastify()

    fastify.register(async (instance) => {
      instance.web.get('/hello', async () => new Response('scoped'))
    }, { prefix: '/api' })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/hello'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.body, 'scoped')
  })

  test('web.put method works', async (t) => {
    t.plan(2)
    const fastify = new Fastify()

    fastify.web.put('/resource', async (req) => {
      const body = await req.json()
      return new Response(JSON.stringify({ updated: body }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    })

    const response = await fastify.inject({
      method: 'PUT',
      url: '/resource',
      payload: { name: 'test' }
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.body), { updated: { name: 'test' } })
  })

  test('web.delete method works', async (t) => {
    t.plan(2)
    const fastify = new Fastify()

    fastify.web.delete('/resource/:id', async (req) => {
      const url = new URL(req.url)
      return new Response(`Deleted: ${url.pathname}`, { status: 200 })
    })

    const response = await fastify.inject({
      method: 'DELETE',
      url: '/resource/123'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.body, 'Deleted: /resource/123')
  })

  test('web.patch method works', async (t) => {
    t.plan(2)
    const fastify = new Fastify()

    fastify.web.patch('/resource', async (req) => {
      const body = await req.json()
      return new Response(JSON.stringify({ patched: body }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    })

    const response = await fastify.inject({
      method: 'PATCH',
      url: '/resource',
      payload: { field: 'value' }
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.body), { patched: { field: 'value' } })
  })

  test('web routes skip validation', async (t) => {
    t.plan(2)
    const fastify = new Fastify()

    // Global validation should not apply to web routes
    fastify.setValidatorCompiler(() => {
      return () => {
        throw new Error('Validation should not be called')
      }
    })

    fastify.web.post('/no-validation', async (req) => {
      const body = await req.json()
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/no-validation',
      payload: { any: 'data' }
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.body), { any: 'data' })
  })

  test('web Request has correct URL', async (t) => {
    t.plan(3)
    const fastify = new Fastify()

    fastify.web.get('/path', async (req) => {
      const url = new URL(req.url)
      return new Response(JSON.stringify({
        pathname: url.pathname,
        method: req.method
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/path?foo=bar'
    })

    t.assert.strictEqual(response.statusCode, 200)
    const body = JSON.parse(response.body)
    t.assert.strictEqual(body.pathname, '/path')
    t.assert.strictEqual(body.method, 'GET')
  })

  test('web Request has correct headers', async (t) => {
    t.plan(2)
    const fastify = new Fastify()

    fastify.web.get('/headers', async (req) => {
      return new Response(req.headers.get('x-custom-header'), { status: 200 })
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/headers',
      headers: {
        'x-custom-header': 'test-value'
      }
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.body, 'test-value')
  })

  test('web routes return non-Response throws error', async (t) => {
    t.plan(1)
    const fastify = new Fastify()

    fastify.web.get('/invalid', async () => {
      return 'not a Response object'
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/invalid'
    })

    t.assert.strictEqual(response.statusCode, 500)
  })

  test('web Response status codes are respected', async (t) => {
    t.plan(1)
    const fastify = new Fastify()

    fastify.web.post('/created', async () => {
      return new Response('Created', { status: 201 })
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/created',
      payload: {}
    })

    t.assert.strictEqual(response.statusCode, 201)
  })

  test('web Response headers are set correctly', async (t) => {
    t.plan(2)
    const fastify = new Fastify()

    fastify.web.get('/custom-headers', async () => {
      return new Response('ok', {
        status: 200,
        headers: {
          'X-Custom-Response': 'custom-value',
          'Content-Type': 'text/plain'
        }
      })
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/custom-headers'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.headers['x-custom-response'], 'custom-value')
  })

  test('web.head method works', async (t) => {
    t.plan(1)
    const fastify = new Fastify()

    fastify.web.head('/resource', async () => {
      return new Response(null, {
        status: 200,
        headers: { 'Content-Length': '100' }
      })
    })

    const response = await fastify.inject({
      method: 'HEAD',
      url: '/resource'
    })

    t.assert.strictEqual(response.statusCode, 200)
  })

  test('web.options method works', async (t) => {
    t.plan(2)
    const fastify = new Fastify()

    fastify.web.options('/resource', async () => {
      return new Response(null, {
        status: 204,
        headers: { Allow: 'GET, POST, OPTIONS' }
      })
    })

    const response = await fastify.inject({
      method: 'OPTIONS',
      url: '/resource'
    })

    t.assert.strictEqual(response.statusCode, 204)
    t.assert.strictEqual(response.headers.allow, 'GET, POST, OPTIONS')
  })

  test('ctx.log is available', async (t) => {
    t.plan(2)
    const fastify = new Fastify()
    let logAvailable = false

    fastify.web.get('/log', async (req, ctx) => {
      logAvailable = typeof ctx.log.info === 'function'
      return new Response('ok')
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/log'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.ok(logAvailable)
  })

  test('ctx.server is the fastify instance', async (t) => {
    t.plan(2)
    const fastify = new Fastify()
    let serverMatches = false

    fastify.web.get('/server', async (req, ctx) => {
      serverMatches = ctx.server === fastify
      return new Response('ok')
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/server'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.ok(serverMatches)
  })

  test('this is bound to fastify instance', async (t) => {
    t.plan(2)
    const fastify = new Fastify()
    let thisMatches = false

    fastify.web.get('/this', async function (req, ctx) {
      thisMatches = this === fastify
      return new Response('ok')
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/this'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.ok(thisMatches)
  })

  test('ctx.log logs at correct level', async (t) => {
    t.plan(2)
    const logs = []
    const fastify = new Fastify({
      logger: {
        level: 'info',
        stream: {
          write (chunk) {
            logs.push(JSON.parse(chunk))
          }
        }
      }
    })

    fastify.web.get('/log-test', async (req, ctx) => {
      ctx.log.info('test message')
      return new Response('ok')
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/log-test'
    })

    t.assert.strictEqual(response.statusCode, 200)
    const testLog = logs.find(l => l.msg === 'test message')
    t.assert.ok(testLog)
  })

  test('this is bound to encapsulated instance in plugin', async (t) => {
    t.plan(3)
    const fastify = new Fastify()
    let thisInPlugin = null
    let pluginInstance = null

    fastify.register(async (instance) => {
      pluginInstance = instance
      instance.web.get('/plugin', async function (req, ctx) {
        thisInPlugin = this
        return new Response('ok')
      })
    }, { prefix: '/api' })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/plugin'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.ok(thisInPlugin !== null)
    t.assert.strictEqual(thisInPlugin, pluginInstance)
  })
})
