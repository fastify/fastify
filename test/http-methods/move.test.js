'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const fastify = require('../../')()
fastify.addHttpMethod('MOVE')

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
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})
test('move test', async t => {
  await fastify.listen({ port: 0 })

  t.after(() => { fastify.close() })

  await t.test('request - move', (t, done) => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test.txt`,
      method: 'MOVE',
      headers: {
        Destination: '/test2.txt'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 201)
      t.assert.strictEqual(response.headers.location, '/test2.txt')
      done()
    })
  })
})
