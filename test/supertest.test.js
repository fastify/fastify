'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const supertest = require('supertest')

test('fastify is compatible with supertest', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.ready((err) => {
    t.error(err)

    supertest(fastify)
      .get('/')
      .expect(200)
      .expect('Content-Type', 'application/json')
      .expect('Content-Length', '17')
      .end((err, res) => {
        t.error(err)
        t.deepEqual(res.body, { hello: 'world' })
      })
  })
})
