'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('..')
const { getServerUrl } = require('./helper')

process.removeAllListeners('warning')

test('Wrong parseAs parameter', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser('application/json', { parseAs: 'fireworks' }, () => {})
    t.assert.fail('should throw')
  } catch (err) {
    t.assert.strictEqual(err.code, 'FST_ERR_CTP_INVALID_PARSE_TYPE')
    t.assert.strictEqual(err.message, "The body parser can only parse your data as 'string' or 'buffer', you asked 'fireworks' which is not supported.")
  }
})

test('Should allow defining the bodyLimit per parser', (t, done) => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser(
    'x/foo',
    { parseAs: 'string', bodyLimit: 5 },
    function (req, body, done) {
      t.assert.fail('should not be invoked')
      done()
    }
  )

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '1234567890',
      headers: {
        'Content-Type': 'x/foo'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(body.toString()), {
        statusCode: 413,
        code: 'FST_ERR_CTP_BODY_TOO_LARGE',
        error: 'Payload Too Large',
        message: 'Request body is too large'
      })
      done()
    })
  })
})

test('route bodyLimit should take precedence over a custom parser bodyLimit', (t, done) => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.post('/', { bodyLimit: 5 }, (request, reply) => {
    reply.send(request.body)
  })

  fastify.addContentTypeParser(
    'x/foo',
    { parseAs: 'string', bodyLimit: 100 },
    function (req, body, done) {
      t.assert.fail('should not be invoked')
      done()
    }
  )

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '1234567890',
      headers: { 'Content-Type': 'x/foo' }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(body.toString()), {
        statusCode: 413,
        code: 'FST_ERR_CTP_BODY_TOO_LARGE',
        error: 'Payload Too Large',
        message: 'Request body is too large'
      })
      done()
    })
  })
})
