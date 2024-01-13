'use strict'

const t = require('tap')
const test = t.test
const net = require('node:net')
const Fastify = require('..')
const statusCodes = require('node:http').STATUS_CODES
const split = require('split2')
const fs = require('node:fs')
const path = require('node:path')

const codes = Object.keys(statusCodes)
codes.forEach(code => {
  if (Number(code) >= 400) helper(code)
})

function helper (code) {
  test('Reply error handling - code: ' + code, t => {
    t.plan(4)
    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))
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
  t.teardown(fastify.close.bind(fastify))
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
  t.teardown(fastify.close.bind(fastify))
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
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0, host: '127.0.0.1' }, err => {
    t.error(err)

    const client = net.connect(fastify.server.address().port, '127.0.0.1')
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

  fastify.listen({ port: 0, host: '127.0.0.1' }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    const client = net.connect(fastify.server.address().port, '127.0.0.1')
    client.end('oooops!')

    let chunks = ''
    client.on('data', chunk => {
      chunks += chunk
    })

    client.once('end', () => {
      t.equal(response, chunks)
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
  t.teardown(fastify.close.bind(fastify))
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
  t.teardown(fastify.close.bind(fastify))
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
  t.teardown(fastify.close.bind(fastify))
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
      t.teardown(fastify.close.bind(fastify))

      fastify.get('/', () => {
        return Promise.reject(nonErr)
      })

      fastify.setErrorHandler((err, request, reply) => {
        if (typeof err === 'object') {
          t.same(err, nonErr)
        } else {
          t.equal(err, nonErr)
        }
        reply.code(500).send('error')
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
  t.teardown(fastify.close.bind(fastify))
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
    reply.code(400).send('error')
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

test('should set the status code and the headers from the error object (from route handler) (no custom error handler)', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

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
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', (req, reply) => {
    const error = new Error('ouch')
    error.statusCode = 401
    reply.send(error)
  })

  fastify.setErrorHandler((err, request, reply) => {
    t.equal(err.message, 'ouch')
    t.equal(reply.raw.statusCode, 200)
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
  t.teardown(fastify.close.bind(fastify))

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
  t.teardown(fastify.close.bind(fastify))

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

test('should not set headers or status code for custom error handler', t => {
  t.plan(7)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.get('/', function (req, reply) {
    const err = new Error('kaboom')
    err.headers = {
      'fake-random-header': 'abc'
    }
    reply.send(err)
  })

  fastify.setErrorHandler(async (err, req, res) => {
    t.equal(res.statusCode, 200)
    t.equal('fake-random-header' in res.headers, false)
    return res.code(500).send(err.message)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.equal('fake-random-header' in res.headers, false)
    t.equal(res.headers['content-length'], ('kaboom'.length).toString())
    t.same(res.payload, 'kaboom')
  })
})

test('error thrown by custom error handler routes to default error handler', t => {
  t.plan(6)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const error = new Error('kaboom')
  error.headers = {
    'fake-random-header': 'abc'
  }

  fastify.get('/', function (req, reply) {
    reply.send(error)
  })

  const newError = new Error('kabong')

  fastify.setErrorHandler(async (err, req, res) => {
    t.equal(res.statusCode, 200)
    t.equal('fake-random-header' in res.headers, false)
    t.same(err.headers, error.headers)

    return res.send(newError)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.same(JSON.parse(res.payload), {
      error: statusCodes['500'],
      message: newError.message,
      statusCode: 500
    })
  })
})

// Refs: https://github.com/fastify/fastify/pull/4484#issuecomment-1367301750
test('allow re-thrown error to default error handler when route handler is async and error handler is sync', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.setErrorHandler(function (error) {
    t.equal(error.message, 'kaboom')
    throw Error('kabong')
  })

  fastify.get('/', async function () {
    throw Error('kaboom')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.same(JSON.parse(res.payload), {
      error: statusCodes['500'],
      message: 'kabong',
      statusCode: 500
    })
  })
})

// Issue 2078 https://github.com/fastify/fastify/issues/2078
// Supported error code list: http://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
const invalidErrorCodes = [
  undefined,
  null,
  'error_code',

  // out of the 100-599 range:
  0,
  1,
  99,
  600,
  700
]
invalidErrorCodes.forEach((invalidCode) => {
  test(`should throw error if error code is ${invalidCode}`, t => {
    t.plan(2)
    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))
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

test('error handler is triggered when a string is thrown from sync handler', t => {
  t.plan(3)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const throwable = 'test'
  const payload = 'error'

  fastify.get('/', function (req, reply) {
    // eslint-disable-next-line no-throw-literal
    throw throwable
  })

  fastify.setErrorHandler((err, req, res) => {
    t.equal(err, throwable)

    res.send(payload)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, payload)
  })
})

test('status code should be set to 500 and return an error json payload if route handler throws any non Error object expression', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

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
  t.teardown(fastify.close.bind(fastify))

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
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const throwable = 'test'
  const payload = 'error'

  fastify.get('/', function async (req, reply) {
    // eslint-disable-next-line no-throw-literal
    throw throwable
  })

  fastify.setErrorHandler((err, req, res) => {
    t.equal(err, throwable)
    res.code(500).send(payload)
  })

  const reply = await fastify.inject({ method: 'GET', url: '/' })
  t.equal(reply.statusCode, 500)
})

test('should trigger error handlers if a sync route throws undefined', async t => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', function async (req, reply) {
    // eslint-disable-next-line no-throw-literal
    throw undefined
  })

  const reply = await fastify.inject({ method: 'GET', url: '/' })
  t.equal(reply.statusCode, 500)
})

test('setting content-type on reply object should not hang the server case 1', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', (req, reply) => {
    reply
      .code(200)
      .headers({ 'content-type': 'text/plain; charset=utf-32' })
      .send(JSON.stringify({ bar: 'foo', baz: 'foobar' }))
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })
})

test('setting content-type on reply object should not hang the server case 2', async t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', (req, reply) => {
    reply
      .code(200)
      .headers({ 'content-type': 'text/plain; charset=utf-8' })
      .send({ bar: 'foo', baz: 'foobar' })
  })

  try {
    await fastify.ready()
    const res = await fastify.inject({
      url: '/',
      method: 'GET'
    })
    t.same({
      error: 'Internal Server Error',
      message: 'Attempted to send payload of invalid type \'object\'. Expected a string or Buffer.',
      statusCode: 500,
      code: 'FST_ERR_REP_INVALID_PAYLOAD_TYPE'
    },
    res.json())
  } catch (error) {
    t.error(error)
  } finally {
    await fastify.close()
  }
})

test('setting content-type on reply object should not hang the server case 3', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', (req, reply) => {
    reply
      .code(200)
      .headers({ 'content-type': 'application/json' })
      .send({ bar: 'foo', baz: 'foobar' })
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })
})

test('pipe stream inside error handler should not cause error', t => {
  t.plan(3)
  const location = path.join(__dirname, '..', 'package.json')
  const json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')).toString('utf8'))

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.setErrorHandler((_error, _request, reply) => {
    const stream = fs.createReadStream(location)
    reply.code(400).type('application/json; charset=utf-8').send(stream)
  })

  fastify.get('/', (request, reply) => {
    throw new Error('This is an error.')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.same(JSON.parse(res.payload), json)
  })
})
