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

test('addHttpMethod emits a deprecation warning when overriding an existing method without overrideExisting flag', (t, done) => {
  t.plan(2)
  const fastify = Fastify()

  // Attach listener BEFORE calling addHttpMethod — process.emitWarning is async (next tick)
  process.once('warning', function onWarning (warning) {
    if (warning.code !== 'FSTWRN005') {
      // Might get an unrelated warning first; re-register for the next one
      process.once('warning', onWarning)
      return
    }
    t.assert.ok(true, 'A FSTWRN005 warning was emitted')
    t.assert.strictEqual(warning.code, 'FSTWRN005')
    done()
  })

  // GET is a built-in bodyless method — calling without overrideExisting should warn
  fastify.addHttpMethod('GET', { hasBody: false })
})


test('addHttpMethod does not emit a warning when overrideExisting is true', t => {
  t.plan(1)
  const fastify = Fastify()

  let warningEmitted = false
  const onWarning = (warning) => {
    if (warning.code === 'FSTWRN005') warningEmitted = true
  }
  process.on('warning', onWarning)

  // POST is a built-in bodywith method — with the flag, no warning should fire
  fastify.addHttpMethod('POST', { overrideExisting: true })

  process.off('warning', onWarning)
  t.assert.ok(!warningEmitted, 'No FSTWRN005 warning should have been emitted')
})


test('addHttpMethod with overrideExisting: true can change existing method body behavior', t => {
  t.plan(2)
  const fastify = Fastify()

  // GET is bodyless by default; override it to accept a body
  t.assert.doesNotThrow(() => {
    fastify.addHttpMethod('GET', { hasBody: true, overrideExisting: true })
  })
  t.assert.ok(fastify.supportedMethods.includes('GET'))
})

