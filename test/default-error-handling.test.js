const t = require('tap')
const test = t.test
const Fastify = require('..')

test('default error handling', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    const err = new Error('kaboom')
    err.headers = {
      'fake-random-header': 'abc'
    }
    reply.send(err)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(res.headers['fake-random-header'], 'abc')
    t.deepEqual(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      message: 'kaboom',
      statusCode: 500
    })
  })
})

test('custom error handling', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    const err = new Error('kaboom')
    err.headers = {
      'fake-random-header': 'abc'
    }
    reply.send(err)
  })

  fastify.setErrorHandler(async (err, req, res) => {
    res.code(500).send(err.message)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
    t.strictEqual('fake-random-header' in res.headers, false)
    t.deepEqual(res.payload.toString(), 'kaboom')
  })
})
