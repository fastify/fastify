'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('Should rewrite url', t => {
  t.plan(4)
  const fastify = Fastify({
    rewriteUrl (req) {
      t.equal(req.url, '/this-would-404-without-url-rewrite')
      return '/'
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/this-would-404-without-url-rewrite'
  }, (err, res) => {
    t.error(err)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
    t.strictEqual(res.statusCode, 200)
  })
})
