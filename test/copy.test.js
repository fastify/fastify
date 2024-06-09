'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

test('can be created - copy', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'COPY',
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

  test('request - copy', t => {
    t.plan(2)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test.txt`,
      method: 'COPY',
      headers: {
        Destination: '/test2.txt'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 204)
    })
  })
})
