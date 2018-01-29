'use strict'

const test = require('tap').test
const sget = require('simple-get')
const Fastify = require('../')

test('Should honor ignoreTrailingSlash option', t => {
  t.plan(4)
  const fastify = Fastify({
    ignoreTrailingSlash: true
  })

  fastify.get('/test', (req, res) => {
    res.send('test')
  })

  fastify.listen(0, (err) => {
    fastify.server.unref()
    if (err) t.threw(err)

    const baseUrl = 'http://127.0.0.1:' + fastify.server.address().port

    sget.concat(baseUrl + '/test', (err, res, data) => {
      if (err) t.threw(err)
      t.is(res.statusCode, 200)
      t.is(data.toString(), 'test')
    })

    sget.concat(baseUrl + '/test/', (err, res, data) => {
      if (err) t.threw(err)
      t.is(res.statusCode, 200)
      t.is(data.toString(), 'test')
    })
  })
})

test('Should honor maxParamLength option', t => {
  t.plan(4)
  const fastify = Fastify({ maxParamLength: 10 })

  fastify.get('/test/:id', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/test/123456789'
  }, (error, res) => {
    t.error(error)
    t.strictEqual(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/test/123456789abcd'
  }, (error, res) => {
    t.error(error)
    t.strictEqual(res.statusCode, 404)
  })
})
