'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('should remove content-type for setErrorHandler', async t => {
  t.plan(6)
  let count = 0

  const fastify = Fastify()
  fastify.setErrorHandler(function (error, request, reply) {
    t.same(error.message, 'kaboom')
    t.same(reply.hasHeader('content-type'), false)
    reply.code(400).send({ foo: 'bar' })
  })
  fastify.addHook('onSend', async function (request, reply, payload) {
    count++
    t.same(typeof payload, 'string')
    switch (count) {
      case 1: {
        throw Error('kaboom')
      }
      case 2: {
        return payload
      }
      default: {
        t.fail('should not reach')
      }
    }
  })
  fastify.get('/', function (request, reply) {
    reply.send('plain-text')
  })

  const { statusCode, body } = await fastify.inject({ method: 'GET', path: '/' })
  t.same(statusCode, 400)
  t.same(body, JSON.stringify({ foo: 'bar' }))
})
