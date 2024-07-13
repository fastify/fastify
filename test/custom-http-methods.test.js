'use strict'

const { test } = require('tap')
const Fastify = require('../fastify')

function addEcho (fastify, method) {
  fastify.route({
    method,
    url: '/',
    handler: function (req, reply) {
      reply.send(req.body)
    }
  })
}

test('acceptHTTPMethod adds a new custom method without body', t => {
  t.plan(3)
  const app = Fastify()

  t.throws(() => { addEcho(app, 'REBIND') }, /REBIND method is not supported./)

  app.acceptHTTPMethod('REBIND')
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

test('acceptHTTPMethod adds a new custom method with body', t => {
  t.plan(3)
  const app = Fastify()

  app.acceptHTTPMethod('REBIND', { hasBody: true })
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

test('acceptHTTPMethod rejects fake http method', t => {
  t.plan(1)
  const fastify = Fastify()
  t.throws(() => { fastify.acceptHTTPMethod('FOOO') }, /Provided method is invalid!/)
})
