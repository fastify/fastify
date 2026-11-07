'use strict'

const http = require('node:http')
const { test } = require('node:test')
const Fastify = require('../../fastify')

function addEcho (fastify, method) {
  fastify.route({
    method,
    url: '/',
    handler: function (req, reply) {
      reply.send(req.body)
    }
  })
}

test('missing method from http client', (t, done) => {
  t.plan(2)
  const fastify = Fastify()

  fastify.listen({ port: 3000 }, (err) => {
    t.assert.ifError(err)

    const port = fastify.server.address().port
    const req = http.request({
      port,
      method: 'REBIND',
      path: '/'
    }, (res) => {
      t.assert.strictEqual(res.statusCode, 404)
      fastify.close()
      done()
    })

    req.end()
  })
})

test('addHttpMethod increase the supported HTTP methods supported', (t, done) => {
  t.plan(8)
  const app = Fastify()

  t.assert.throws(() => { addEcho(app, 'REBIND') }, /REBIND method is not supported./)
  t.assert.ok(!app.supportedMethods.includes('REBIND'))
  t.assert.ok(!app.rebind)

  app.addHttpMethod('REBIND')
  t.assert.doesNotThrow(() => { addEcho(app, 'REBIND') }, 'REBIND method is supported.')
  t.assert.ok(app.supportedMethods.includes('REBIND'))
  t.assert.ok(app.rebind)

  app.rebind('/foo', () => 'hello')

  app.inject({
    method: 'REBIND',
    url: '/foo'
  }, (err, response) => {
    t.assert.ifError(err)
    t.assert.strictEqual(response.payload, 'hello')
    done()
  })
})

test('addHttpMethod adds a new custom method without body', t => {
  t.plan(3)
  const app = Fastify()

  t.assert.throws(() => { addEcho(app, 'REBIND') }, /REBIND method is not supported./)

  app.addHttpMethod('REBIND')
  t.assert.doesNotThrow(() => { addEcho(app, 'REBIND') }, 'REBIND method is supported.')

  t.assert.throws(() => {
    app.route({
      url: '/',
      method: 'REBIND',
      schema: {
        body: {
          type: 'object',
          properties: {
            hello: { type: 'string' }
          }
        }
      },
      handler: function (req, reply) {
        reply.send(req.body)
      }
    })
  }, /Body validation schema for REBIND:\/ route is not supported!/)
})

test('addHttpMethod adds a new custom method with body', (t, done) => {
  t.plan(3)
  const app = Fastify()

  app.addHttpMethod('REBIND', { hasBody: true })
  t.assert.doesNotThrow(() => { addEcho(app, 'REBIND') }, 'REBIND method is supported.')

  app.inject({
    method: 'REBIND',
    url: '/',
    payload: { hello: 'world' }
  }, (err, response) => {
    t.assert.ifError(err)
    t.assert.deepStrictEqual(response.json(), { hello: 'world' })
    done()
  })
})

test('addHttpMethod rejects fake http method', t => {
  t.plan(1)
  const fastify = Fastify()
  t.assert.throws(() => { fastify.addHttpMethod('FOOO') }, /Provided method is invalid!/)
})

test('addHttpMethod rejects an implicit override of an existing method', t => {
  const fastify = Fastify()

  t.after(() => {
    fastify.close()
  })

  t.assert.throws(
    () => fastify.addHttpMethod('GET', { hasBody: true }),
    {
      code: 'FST_ERR_ROUTE_METHOD_ALREADY_SUPPORTED',
      message: 'Method "GET" is already supported. Use `overrideExisting: true` to override it.'
    }
  )
})

test('addHttpMethod allows an explicit override of an existing method', t => {
  const fastify = Fastify()
  t.after(() => {
    fastify.close()
  })

  t.assert.doesNotThrow(() => {
    fastify.addHttpMethod('POST', { overrideExisting: true })
  })
})

test('addHttpMethod can change an existing method body behavior', async t => {
  const fastify = Fastify()

  fastify.addHttpMethod('GET', {
    hasBody: true,
    overrideExisting: true
  })
  fastify.route({
    method: 'GET',
    url: '/',
    exposeHeadRoute: false,
    schema: {
      body: {
        type: 'object'
      }
    },
    handler: async request => request.body
  })

  const response = await fastify.inject({
    method: 'GET',
    url: '/',
    payload: { hello: 'world' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(response.json(), { hello: 'world' })
})
