'use strict'

const { test } = require('node:test')
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
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('mkcol test - request', async t => {
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  t.plan(2)
  await new Promise((resolve, reject) => {
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/`,
      method: 'MKCOL'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 201)
      resolve()
    })
  })
})
