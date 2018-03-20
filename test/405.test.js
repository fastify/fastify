'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const sget = require('simple-get').concat

test('405', t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  const injectOptions = {
    method: 'TRACE',
    url: '/',
    payload: '{}'
  }
  fastify.inject(injectOptions)
    .then(response => {
      t.strictEqual(response.statusCode, 405)
    })
    .catch(t.fail)
})

test('Unsupported method', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.inject({
      method: 'PROPFIND',
      url: '/'
    }, (err, res) => {
      t.error(err)
      t.strictEqual(res.statusCode, 405)

      sget({
        method: 'PROPFIND',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 405)
      })
    })
  })
})
