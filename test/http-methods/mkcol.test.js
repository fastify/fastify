'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('../../')()
fastify.addHttpMethod('MKCOL')

test('can be created - mkcol', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'MKCOL',
      url: '*',
      handler: function (req, reply) {
        reply.code(201).send()
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
    t.plan(2)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/`,
      method: 'MKCOL'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 201)
    })
  })
})
