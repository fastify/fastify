'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']

test('fastify.all should add all the methods to the same url', t => {
  t.plan(supportedMethods.length)

  const fastify = Fastify()

  fastify.all('/', (req, reply) => {
    reply.send({ method: req.req.method })
  })

  supportedMethods.forEach(injectRequest)

  function injectRequest (method) {
    const options = {
      url: '/',
      method: method
    }

    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      options.payload = { hello: 'world' }
    }

    fastify.inject(options, res => {
      var payload = JSON.parse(res.payload)
      t.deepEqual(payload, { method: method })
    })
  }
})
