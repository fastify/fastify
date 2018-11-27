'use strict'

const t = require('tap')
const Fastify = require('..')
const fastify = Fastify()

fastify.route({
  method: 'POST',
  path: '/jsonBody',
  handler: function (req, reply) {
    throw new Error('kaboom')
  }
})

const reqOpts = {
  method: 'POST',
  url: '/jsonBody',
  payload: {
    hello: 'world'
  }
}

process.on('uncaughtException', (err) => {
  t.equal(err.message, 'kaboom')
})

fastify.inject(reqOpts, (e, res) => {
  t.plan(1)
  t.fail('should not be called')
})
