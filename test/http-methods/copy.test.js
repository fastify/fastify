'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const fastify = require('../../fastify')()
fastify.addHttpMethod('COPY')

test('can be created - copy', (t, done) => {
  t.plan(4)

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => { fastify.close() })

    sget({
      url: `http://localhost:${fastify.server.address().port}/test.txt`,
      method: 'COPY',
      headers: {
        Destination: '/test2.txt'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 204)
      done()
    })
  })

  try {
    fastify.route({
      method: 'COPY',
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
