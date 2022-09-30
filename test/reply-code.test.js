'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('code should handle null/undefined/float', t => {
  t.plan(8)

  const fastify = Fastify()

  fastify.get('/null', function (request, reply) {
    reply.status(null).send()
  })

  fastify.get('/undefined', function (request, reply) {
    reply.status(undefined).send()
  })

  fastify.get('/404.5', function (request, reply) {
    reply.status(404.5).send()
  })

  fastify.inject({
    method: 'GET',
    url: '/null'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 500)
    t.same(res.json(), {
      statusCode: 500,
      code: 'FST_ERR_BAD_STATUS_CODE',
      error: 'Internal Server Error',
      message: 'Called reply with an invalid status code: null'
    })
  })

  fastify.inject({
    method: 'GET',
    url: '/undefined'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 500)
    t.same(res.json(), {
      statusCode: 500,
      code: 'FST_ERR_BAD_STATUS_CODE',
      error: 'Internal Server Error',
      message: 'Called reply with an invalid status code: undefined'
    })
  })

  fastify.inject({
    method: 'GET',
    url: '/404.5'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })
})
