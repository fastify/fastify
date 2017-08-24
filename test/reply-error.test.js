'use strict'

const t = require('tap')
const test = t.test
const net = require('net')
const Fastify = require('..')
const statusCodes = require('http').STATUS_CODES
const boom = require('boom')

const codes = Object.keys(statusCodes)
codes.forEach(code => {
  if (Number(code) >= 400) helper(code)
})

function helper (code) {
  test('Reply error handling - code: ' + code, t => {
    t.plan(3)
    const fastify = Fastify()
    const err = new Error('winter is coming')

    fastify.get('/', (req, reply) => {
      reply
        .code(Number(code))
        .send(err)
    })

    fastify.inject({
      method: 'GET',
      url: '/'
    }, res => {
      t.strictEqual(res.statusCode, Number(code))
      t.equal(res.headers['content-type'], 'application/json')
      t.deepEqual(
        {
          error: statusCodes[code],
          message: err.message,
          statusCode: Number(code)
        },
        JSON.parse(res.payload)
      )
    })
  })
}

test('preHandler hook error handling with external code', t => {
  t.plan(2)
  const fastify = Fastify()
  const err = new Error('winter is coming')

  fastify.addHook('preHandler', (req, reply, done) => {
    reply.code(400)
    done(err)
  })

  fastify.get('/', () => {})

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.strictEqual(res.statusCode, 400)
    t.deepEqual(
      {
        error: statusCodes['400'],
        message: err.message,
        statusCode: 400
      },
      JSON.parse(res.payload)
    )
  })
})

test('onRequest hook error handling with external done', t => {
  t.plan(2)
  const fastify = Fastify()
  const err = new Error('winter is coming')

  fastify.addHook('onRequest', (req, res, done) => {
    res.statusCode = 400
    done(err)
  })

  fastify.get('/', () => {})

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.strictEqual(res.statusCode, 400)
    t.deepEqual(
      {
        error: statusCodes['400'],
        message: err.message,
        statusCode: 400
      },
      JSON.parse(res.payload)
    )
  })
})

test('support for boom', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/500', (req, reply) => {
    reply.send(boom.create(500, 'winter is coming', { hello: 'world' }))
  })

  fastify.get('/400', (req, reply) => {
    reply.send(boom.create(400, 'winter is coming', { hello: 'world' }))
  })

  fastify.get('/401', (req, reply) => {
    reply.send(boom.unauthorized('invalid password', 'sample'))
  })

  t.test('500', t => {
    t.plan(3)

    fastify.inject({
      method: 'GET',
      url: '/500'
    }, res => {
      t.strictEqual(res.statusCode, 500)
      t.strictEqual(res.headers['content-type'], 'application/json')
      t.deepEqual(
        // we are doing this because Boom creates also a stack that is stripped during the stringify phase
        JSON.parse(res.payload),
        {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        }
      )
    })
  })

  t.test('400', t => {
    t.plan(3)

    fastify.inject({
      method: 'GET',
      url: '/400'
    }, res => {
      t.strictEqual(res.statusCode, 400)
      t.strictEqual(res.headers['content-type'], 'application/json')
      t.deepEqual(
        // we are doing this because Boom creates also a stack that is stripped during the stringify phase
        JSON.parse(res.payload),
        {
          statusCode: 400,
          error: 'Bad Request',
          message: 'winter is coming'
        }
      )
    })
  })

  t.test('401', t => {
    t.plan(4)

    fastify.inject({
      method: 'GET',
      url: '/401'
    }, res => {
      t.strictEqual(res.statusCode, 401)
      t.strictEqual(res.headers['content-type'], 'application/json')
      t.deepEqual(
        // we are doing this because Boom creates also a stack that is stripped during the stringify phase
        JSON.parse(res.payload),
        {
          statusCode: 401,
          error: 'Unauthorized',
          message: 'invalid password',
          attributes: {
            error: 'invalid password'
          }
        }
      )
      t.deepEqual(res.headers['www-authenticate'], 'sample error="invalid password"')
    })
  })
})

test('extendServerError should exist', t => {
  t.plan(2)
  const fastify = Fastify()
  t.ok(fastify.extendServerError)
  t.is(typeof fastify.extendServerError, 'function')
})

test('extend server error - encapsulation', t => {
  t.plan(6)
  const fastify = Fastify()
  const err = new Error('error')
  const date = new Date()

  fastify.get('/', (req, reply) => {
    t.notOk(reply._extendServerError)
    reply.send(err)
  })

  fastify.register((instance, opts, next) => {
    instance.extendServerError(() => {
      return {
        timestamp: date
      }
    })

    instance.get('/encapsulated', (req, reply) => {
      t.ok(reply._extendServerError)
      reply.send(err)
    })

    next()
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.strictEqual(res.statusCode, 500)
    t.deepEqual(
      {
        error: statusCodes['500'],
        message: err.message,
        statusCode: 500
      },
      JSON.parse(res.payload)
    )
  })

  fastify.inject({
    method: 'GET',
    url: '/encapsulated'
  }, res => {
    t.strictEqual(res.statusCode, 500)
    t.deepEqual(
      {
        error: statusCodes['500'],
        message: err.message,
        statusCode: 500,
        timestamp: date.toISOString()
      },
      JSON.parse(res.payload)
    )
  })
})

test('extend server error - should throw if the argument is not a function', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.extendServerError(null)
    t.fail()
  } catch (e) {
    t.is(e.message, 'The server error object must be a function')
  }
})

test('extend server error - should throw if the function does not return an object', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.extendServerError(() => null)
    t.fail()
  } catch (e) {
    t.is(e.message, 'The error extender must return an object')
  }
})

if (Number(process.versions.node[0]) >= 6) {
  test('Should reply 400 on client error', t => {
    t.plan(2)

    const fastify = Fastify()
    fastify.listen(0, err => {
      t.error(err)

      const client = net.connect(fastify.server.address().port)
      client.end('oooops!')

      var chunks = ''
      client.on('data', chunk => {
        chunks += chunk
      })

      client.once('end', () => {
        const body = JSON.stringify({
          error: 'Bad Request',
          message: 'Client Error',
          statusCode: 400
        })
        t.equal(`HTTP/1.1 400 Bad Request\r\nContent-Length: ${body.length}\r\nContent-Type: 'application/json'\r\n\r\n${body}`, chunks)
        fastify.close()
      })
    })
  })
}
