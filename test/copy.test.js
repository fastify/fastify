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
        reply.code(204)
          .header('location', req.headers.destination)
          .header('body', req.body.toString())
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

  test('request - copy', t => {
    t.plan(4)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test.txt`,
      method: 'COPY',
      headers: {
        destination: '/test2.txt',
        'Content-Type': 'text/plain'
      },
      body: '/test3.txt'
    }, (err, response) => {
      t.error(err)
      t.equal(response.headers.location, '/test2.txt')
      t.equal(response.headers.body, '/test3.txt')
      t.equal(response.statusCode, 204)
    })
  })
})
