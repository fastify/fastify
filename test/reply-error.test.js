'use strict'

const t = require('tap')
const test = t.test
const net = require('net')
const Fastify = require('..')
const statusCodes = require('http').STATUS_CODES
const split = require('split2')

const codes = Object.keys(statusCodes)
codes.forEach(code => {
  if (Number(code) >= 400) helper(code)
})

function helper (code) {
  test('Reply error handling - code: ' + code, t => {
    t.plan(4)
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
    }, (error, res) => {
      t.error(error)
      t.equal(res.statusCode, Number(code))
      t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
      t.same(
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
  t.plan(3)
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
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 400)
    t.same(
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
  t.plan(3)
  const fastify = Fastify()
  const err = new Error('winter is coming')

  fastify.addHook('onRequest', (req, reply, done) => {
    reply.code(400)
    done(err)
  })

  fastify.get('/', () => {})

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 400)
    t.same(
      {
        error: statusCodes['400'],
        message: err.message,
        statusCode: 400
      },
      JSON.parse(res.payload)
    )
  })
})

test('Should reply 400 on client error', t => {
  t.plan(2)

  const fastify = Fastify()
  fastify.listen(0, err => {
    t.error(err)

    const client = net.connect(fastify.server.address().port)
    client.end('oooops!')

    let chunks = ''
    client.on('data', chunk => {
      chunks += chunk
    })

    client.once('end', () => {
      const body = JSON.stringify({
        error: 'Bad Request',
        message: 'Client Error',
        statusCode: 400
      })
      t.equal(`HTTP/1.1 400 Bad Request\r\nContent-Length: ${body.length}\r\nContent-Type: application/json\r\n\r\n${body}`, chunks)
      fastify.close()
    })
  })
})

test('Should set the response from client error handler', t => {
  t.plan(5)

  const responseBody = JSON.stringify({
    error: 'Ended Request',
    message: 'Serious Client Error',
    statusCode: 400
  })
  const response = `HTTP/1.1 400 Bad Request\r\nContent-Length: ${responseBody.length}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${responseBody}`

  function clientErrorHandler (err, socket) {
    t.type(err, Error)

    this.log.warn({ err }, 'Handled client error')
    socket.end(response)
  }

  const logStream = split(JSON.parse)
  const fastify = Fastify({
    clientErrorHandler,
    logger: {
      stream: logStream,
      level: 'warn'
    }
  })

  fastify.listen(0, err => {
    t.error(err)

    const client = net.connect(fastify.server.address().port)
    client.end('oooops!')

    let chunks = ''
    client.on('data', chunk => {
      chunks += chunk
    })

    client.once('end', () => {
      t.equal(response, chunks)
      fastify.close()
    })
  })

  logStream.once('data', line => {
    t.equal('Handled client error', line.msg)
    t.equal(40, line.level, 'Log level is not warn')
  })
})

test('Error instance sets HTTP status code', t => {
  t.plan(3)
  const fastify = Fastify()
  const err = new Error('winter is coming')
  err.statusCode = 418

  fastify.get('/', () => {
    return Promise.reject(err)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 418)
    t.same(
      {
        error: statusCodes['418'],
        message: err.message,
        statusCode: 418
      },
      JSON.parse(res.payload)
    )
  })
})

test('Error status code below 400 defaults to 500', t => {
  t.plan(3)
  const fastify = Fastify()
  const err = new Error('winter is coming')
  err.statusCode = 399

  fastify.get('/', () => {
    return Promise.reject(err)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 500)
    t.same(
      {
        error: statusCodes['500'],
        message: err.message,
        statusCode: 500
      },
      JSON.parse(res.payload)
    )
  })
})

test('Error.status property support', t => {
  t.plan(3)
  const fastify = Fastify()
  const err = new Error('winter is coming')
  err.status = 418

  fastify.get('/', () => {
    return Promise.reject(err)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 418)
    t.same(
      {
        error: statusCodes['418'],
        message: err.message,
        statusCode: 418
      },
      JSON.parse(res.payload)
    )
  })
})

test('Support rejection with values that are not Error instances', t => {
  const objs = [
    0,
    '',
    [],
    {},
    null,
    undefined,
    123,
    'abc',
    new RegExp(),
    new Date(),
    new Uint8Array()
  ]
  t.plan(objs.length)
  for (const nonErr of objs) {
    t.test('Type: ' + typeof nonErr, t => {
      t.plan(4)
      const fastify = Fastify()

      fastify.get('/', () => {
        return Promise.reject(nonErr)
      })

      fastify.setErrorHandler((err, request, reply) => {
        if (typeof err === 'object') {
          t.same(err, nonErr)
        } else {
          t.equal(err, nonErr)
        }
        reply.send('error')
      })

      fastify.inject({
        method: 'GET',
        url: '/'
      }, (error, res) => {
        t.error(error)
        t.equal(res.statusCode, 500)
        t.equal(res.payload, 'error')
      })
    })
  }
})

test('invalid schema - ajv', t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, (req, reply) => {
    t.fail('we should not be here')
  })

  fastify.setErrorHandler((err, request, reply) => {
    t.ok(Array.isArray(err.validation))
    reply.send('error')
  })

  fastify.inject({
    url: '/?id=abc',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.equal(res.payload, 'error')
  })
})

test('should set the status code and the headers from the error object (from route handler)', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    const error = new Error('kaboom')
    error.headers = { hello: 'world' }
    error.statusCode = 400
    reply.send(error)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.equal(res.headers.hello, 'world')
    t.same(JSON.parse(res.payload), {
      error: 'Bad Request',
      message: 'kaboom',
      statusCode: 400
    })
  })
})

test('should set the status code and the headers from the error object (from custom error handler)', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    const error = new Error('ouch')
    error.statusCode = 401
    reply.send(error)
  })

  fastify.setErrorHandler((err, request, reply) => {
    t.equal(err.message, 'ouch')
    t.equal(reply.raw.statusCode, 401)
    const error = new Error('kaboom')
    error.headers = { hello: 'world' }
    error.statusCode = 400
    reply.send(error)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.equal(res.headers.hello, 'world')
    t.same(JSON.parse(res.payload), {
      error: 'Bad Request',
      message: 'kaboom',
      statusCode: 400
    })
  })
})

// Issue 595 https://github.com/fastify/fastify/issues/595
test('\'*\' should throw an error due to serializer can not handle the payload type', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.type('text/html')
    try {
      reply.send({})
    } catch (err) {
      t.type(err, TypeError)
      t.equal(err.code, 'FST_ERR_REP_INVALID_PAYLOAD_TYPE')
      t.equal(err.message, "Attempted to send payload of invalid type 'object'. Expected a string or Buffer.")
    }
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (e, res) => {
    t.fail('should not be called')
  })
})

test('should throw an error if the custom serializer does not serialize the payload to a valid type', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    try {
      reply
        .type('text/html')
        .serializer(payload => payload)
        .send({})
    } catch (err) {
      t.type(err, TypeError)
      t.equal(err.code, 'FST_ERR_REP_INVALID_PAYLOAD_TYPE')
      t.equal(err.message, "Attempted to send payload of invalid type 'object'. Expected a string or Buffer.")
    }
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (e, res) => {
    t.fail('should not be called')
  })
})

// Issue 2078 https://github.com/fastify/fastify/issues/2078
// Supported error code list: http://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
const invalidErrorCodes = [
  undefined,
  null,
  'error_code',
  700 // out of the 100-600 range
]
invalidErrorCodes.forEach((invalidCode) => {
  test(`should throw error if error code is ${invalidCode}`, t => {
    t.plan(2)
    const fastify = Fastify()
    fastify.get('/', (request, reply) => {
      try {
        return reply.code(invalidCode).send('You should not read this')
      } catch (err) {
        t.equal(err.code, 'FST_ERR_BAD_STATUS_CODE')
        t.equal(err.message, 'Called reply with an invalid status code: ' + invalidCode)
      }
    })
    fastify.inject({
      url: '/',
      method: 'GET'
    }, (e, res) => {
      t.fail('should not be called')
    })
  })
})

test('status code should be set to 500 and return an error json payload if route handler throws any non Error object expression', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/', () => {
    /* eslint-disable-next-line */
    throw { foo: 'bar' }
  })

  // ----
  const reply = await fastify.inject({ method: 'GET', url: '/' })
  t.equal(reply.statusCode, 500)
  t.equal(JSON.parse(reply.body).foo, 'bar')
})

test('should preserve the status code set by the user if an expression is thrown in a sync route', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/', (_, rep) => {
    rep.status(501)

    /* eslint-disable-next-line */
    throw { foo: 'bar' }
  })

  // ----
  const reply = await fastify.inject({ method: 'GET', url: '/' })
  t.equal(reply.statusCode, 501)
  t.equal(JSON.parse(reply.body).foo, 'bar')
})

test('should trigger error handlers if a sync route throws any non-error object', async t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.get('/', () => {
    /* eslint-disable-next-line */
    throw { foo: 'bar' }
  })

  fastify.setErrorHandler(async (error) => {
    t.ok(error)
    return error
  })

  // ----
  const reply = await fastify.inject({ method: 'GET', url: '/' })
  t.equal(reply.statusCode, 500)
  t.equal(JSON.parse(reply.body).foo, 'bar')
})
