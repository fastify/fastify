'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const fastify = require('../../fastify')()
fastify.addHttpMethod('UNLOCK')

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
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('unlock test', async t => {
  await fastify.listen({ port: 0 })

  t.after(() => { fastify.close() })
  await t.test('request - unlock', (t, done) => {
    t.plan(2)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/a.txt`,
      method: 'UNLOCK',
      headers: {
        'Lock-Token': 'urn:uuid:a515cfa4-5da4-22e1-f5b5-00a0451e6bf7'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 204)
      done()
    })
  })
})
