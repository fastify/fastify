'use strict'

const Fastify = require('..')
const sget = require('simple-get').concat
const t = require('tap')
const test = t.test

test('jsonBodyLimit', t => {
  t.plan(5)

  try {
    Fastify({ jsonBodyLimit: 1.3 })
    t.fail('option must be an integer')
  } catch (err) {
    t.ok(err)
  }

  try {
    Fastify({ jsonBodyLimit: [] })
    t.fail('option must be an integer')
  } catch (err) {
    t.ok(err)
  }

  const fastify = Fastify({ jsonBodyLimit: 1 })

  fastify.post('/', (request, reply) => {
    reply.send({error: 'handler should not be called'})
  })

  fastify.listen(0, function (err) {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 413)
    })
  })
})
