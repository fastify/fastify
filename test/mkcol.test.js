'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

test('can be created - mkcol', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'MKCOL',
      url: '*',
      handler: function (req, reply) {
        reply.code(201).header('body', req.body.toString()).send()
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

  test('request - mkcol', t => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/`,
      method: 'MKCOL',
      headers: { 'Content-Type': 'text/plain' },
      body: '/test.txt'
    }, (err, response) => {
      t.error(err)
      t.equal(response.headers.body, '/test.txt')
      t.equal(response.statusCode, 201)
    })
  })
})
