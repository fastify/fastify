'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const sget = require('simple-get').concat

test('Should rewrite url', t => {
  t.plan(5)
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

  fastify.listen(0, function (err) {
    fastify.server.unref()
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/this-would-404-without-url-rewrite'
    }, (err, response, body) => {
      t.error(err)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
      t.strictEqual(response.statusCode, 200)
      t.end()
    })
  })
})
