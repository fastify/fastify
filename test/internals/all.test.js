'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')

test('fastify.all should add all the methods to the same url', t => {
  const fastify = Fastify()

  const requirePayload = [
    'POST',
    'PUT',
    'PATCH'
  ]

  const supportedMethods = fastify.supportedMethods
  t.plan(supportedMethods.length * 2)

  fastify.all('/', (req, reply) => {
    reply.send({ method: req.raw.method })
  })

  supportedMethods.forEach(injectRequest)

  function injectRequest (method) {
    const options = {
      url: '/',
      method
    }

    if (requirePayload.includes(method)) {
      options.payload = { hello: 'world' }
    }

    fastify.inject(options, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.same(payload, { method })
    })
  }
})
