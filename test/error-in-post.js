'use strict'

const t = require('tap')
const Fastify = require('..')
const fastify = Fastify()

let errored = false

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
  errored = true
  t.equal(err.message, 'kaboom')
})

fastify.inject(reqOpts, (e, res) => {
  t.fail('should not be called')
})

process.on('beforeExit', () => {
  t.ok(errored)
})
