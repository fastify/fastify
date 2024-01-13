'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

test('shorthand - move', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'MOVE',
      url: '*',
      handler: function (req, reply) {
        const destination = req.headers.destination
        reply.code(201)
          .header('location', destination)
          .send()
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

  test('request - move', t => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test.txt`,
      method: 'MOVE',
      headers: {
        Destination: '/test2.txt'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 201)
      t.equal(response.headers.location, '/test2.txt')
    })
  })
})
