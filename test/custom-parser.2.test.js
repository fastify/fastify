'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('../fastify')
const { getServerUrl } = require('./helper')

process.removeAllListeners('warning')

test('Wrong parseAs parameter', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser('application/json', { parseAs: 'fireworks' }, () => {})
    t.fail('should throw')
  } catch (err) {
    t.equal(err.code, 'FST_ERR_CTP_INVALID_PARSE_TYPE')
    t.equal(err.message, "The body parser can only parse your data as 'string' or 'buffer', you asked 'fireworks' which is not supported.")
  }
})

test('Should allow defining the bodyLimit per parser', t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser(
    'x/foo',
    { parseAs: 'string', bodyLimit: 5 },
    function (req, body, done) {
      t.fail('should not be invoked')
      done()
    }
  )

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '1234567890',
      headers: {
        'Content-Type': 'x/foo'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictSame(JSON.parse(body.toString()), {
        statusCode: 413,
        code: 'FST_ERR_CTP_BODY_TOO_LARGE',
        error: 'Payload Too Large',
        message: 'Request body is too large'
      })
      fastify.close()
    })
  })
})

test('route bodyLimit should take precedence over a custom parser bodyLimit', t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify.post('/', { bodyLimit: 5 }, (request, reply) => {
    reply.send(request.body)
  })

  fastify.addContentTypeParser(
    'x/foo',
    { parseAs: 'string', bodyLimit: 100 },
    function (req, body, done) {
      t.fail('should not be invoked')
      done()
    }
  )

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '1234567890',
      headers: { 'Content-Type': 'x/foo' }
    }, (err, response, body) => {
      t.error(err)
      t.strictSame(JSON.parse(body.toString()), {
        statusCode: 413,
        code: 'FST_ERR_CTP_BODY_TOO_LARGE',
        error: 'Payload Too Large',
        message: 'Request body is too large'
      })
      fastify.close()
    })
  })
})
