'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const sget = require('simple-get').concat

test('case insensitive', t => {
  t.plan(4)

  const fastify = Fastify({
    caseSensitive: false
  })
  t.tearDown(fastify.close.bind(fastify))

  fastify.get('/foo', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/FOO'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), {
        hello: 'world'
      })
    })
  })
})

test('case insensitive inject', t => {
  t.plan(4)

  const fastify = Fastify({
    caseSensitive: false
  })
  t.tearDown(fastify.close.bind(fastify))

  fastify.get('/foo', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)

    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/FOO'
    }, (err, response) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(response.payload), {
        hello: 'world'
      })
    })
  })
})
