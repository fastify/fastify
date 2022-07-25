'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

test('can be created - unlock', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'UNLOCK',
      url: '*',
      handler: function (req, reply) {
        reply.code(204).send()
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen({ port: 0 }, err => {
  t.error(err)
  t.teardown(() => { fastify.close() })

  test('request - unlock', t => {
    t.plan(2)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/a.txt`,
      method: 'UNLOCK',
      headers: {
        'Lock-Token': 'urn:uuid:a515cfa4-5da4-22e1-f5b5-00a0451e6bf7'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 204)
    })
  })
})
