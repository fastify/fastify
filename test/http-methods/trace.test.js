'use strict'

const t = require('tap')
const test = t.test
const fastify = require('../../fastify')()
fastify.addHttpMethod('TRACE')

test('shorthand - trace', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'TRACE',
      url: '/',
      handler: function (request, reply) {
        reply.code(200).send('TRACE OK')
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})
