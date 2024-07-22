'use strict'

const http = require('node:http')
const { test } = require('tap')
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

test('missing method from http client', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.listen({ port: 3000 }, (err) => {
    t.error(err)

    const port = fastify.server.address().port
    const req = http.request({
      port,
      method: 'REBIND',
      path: '/'
    }, (res) => {
      t.equal(res.statusCode, 404)
      fastify.close()
    })

    req.end()
  })
})

test('addHttpMethod increase the supported HTTP methods supported', t => {
  t.plan(8)
  const app = Fastify()

  t.throws(() => { addEcho(app, 'REBIND') }, /REBIND method is not supported./)
  t.notOk(app.supportedMethods.includes('REBIND'))
  t.notOk(app.rebind)

  app.addHttpMethod('REBIND')
  t.doesNotThrow(() => { addEcho(app, 'REBIND') }, 'REBIND method is supported.')
  t.ok(app.supportedMethods.includes('REBIND'))
  t.ok(app.rebind)

  app.rebind('/foo', () => 'hello')

  app.inject({
    method: 'REBIND',
    url: '/foo'
  }, (err, response) => {
    t.error(err)
    t.equal(response.payload, 'hello')
  })
})

test('addHttpMethod adds a new custom method without body', t => {
  t.plan(3)
  const app = Fastify()

  t.throws(() => { addEcho(app, 'REBIND') }, /REBIND method is not supported./)

  app.addHttpMethod('REBIND')
  t.doesNotThrow(() => { addEcho(app, 'REBIND') }, 'REBIND method is supported.')

  t.throws(() => {
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

test('addHttpMethod adds a new custom method with body', t => {
  t.plan(3)
  const app = Fastify()

  app.addHttpMethod('REBIND', { hasBody: true })
  t.doesNotThrow(() => { addEcho(app, 'REBIND') }, 'REBIND method is supported.')

  app.inject({
    method: 'REBIND',
    url: '/',
    payload: { hello: 'world' }
  }, (err, response) => {
    t.error(err)
    t.same(response.json(), { hello: 'world' })
  })
})

test('addHttpMethod rejects fake http method', t => {
  t.plan(1)
  const fastify = Fastify()
  t.throws(() => { fastify.addHttpMethod('FOOO') }, /Provided method is invalid!/)
})
