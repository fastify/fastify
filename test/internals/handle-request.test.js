'use strict'

const { test } = require('node:test')
const handleRequest = require('../../lib/handleRequest')
const internals = require('../../lib/handleRequest')[Symbol.for('internals')]
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')
const { kRouteContext } = require('../../lib/symbols')
const buildSchema = require('../../lib/validation').compileSchemasForValidation
const sget = require('simple-get').concat

const Ajv = require('ajv')
const ajv = new Ajv({ coerceTypes: true })

function schemaValidator ({ schema, method, url, httpPart }) {
  const validateFunction = ajv.compile(schema)
  const fn = function (body) {
    const isOk = validateFunction(body)
    if (isOk) return
    return false
  }
  fn.errors = []
  return fn
}

test('handleRequest function - sent reply', t => {
  t.plan(1)
  const request = {}
  const reply = { sent: true }
  const res = handleRequest(null, request, reply)
  t.assert.strictEqual(res, undefined)
})

test('handleRequest function - invoke with error', t => {
  t.plan(1)
  const request = {}
  const reply = {}
  reply.send = (err) => t.assert.strictEqual(err.message, 'Kaboom')
  handleRequest(new Error('Kaboom'), request, reply)
})

test('handler function - invalid schema', t => {
  t.plan(1)
  const res = {}
  res.log = { error: () => {}, info: () => {} }
  const context = {
    config: {
      method: 'GET',
      url: '/an-url'
    },
    schema: {
      body: {
        type: 'object',
        properties: {
          hello: { type: 'number' }
        }
      }
    },
    errorHandler: { func: () => { t.assert.ok('errorHandler called') } },
    handler: () => {},
    Reply,
    Request,
    preValidation: [],
    preHandler: [],
    onSend: [],
    onError: [],
    attachValidation: false,
    schemaErrorFormatter: () => new Error()
  }
  buildSchema(context, schemaValidator)
  const request = {
    body: { hello: 'world' },
    [kRouteContext]: context
  }
  internals.handler(request, new Reply(res, request))
})

test('handler function - reply', t => {
  t.plan(3)
  const res = {}
  res.end = () => {
    t.assert.strictEqual(res.statusCode, 204)
    t.assert.ok(true)
  }
  res.writeHead = () => {}
  const context = {
    handler: (req, reply) => {
      t.assert.strictEqual(typeof reply, 'object')
      reply.code(204)
      reply.send(undefined)
    },
    Reply,
    Request,
    preValidation: [],
    preHandler: [],
    onSend: [],
    onError: [],
    config: {
      url: '',
      method: ''
    }
  }
  buildSchema(context, schemaValidator)
  internals.handler({ [kRouteContext]: context }, new Reply(res, { [kRouteContext]: context }))
})

test('handler function - preValidationCallback with finished response', t => {
  t.plan(0)
  const res = {}
  // Be sure to check only `writableEnded` where is available
  res.writableEnded = true
  res.end = () => {
    t.assert.fail()
  }
  res.writeHead = () => {}
  const context = {
    handler: (req, reply) => {
      t.assert.fail()
      reply.send(undefined)
    },
    Reply,
    Request,
    preValidation: null,
    preHandler: [],
    onSend: [],
    onError: []
  }
  buildSchema(context, schemaValidator)
  internals.handler({ [kRouteContext]: context }, new Reply(res, { [kRouteContext]: context }))
})

test('request should be defined in onSend Hook on post request with content type application/json', (t, done) => {
  t.plan(8)
  const fastify = require('../..')()

  t.after(() => {
    fastify.close()
  })

  fastify.addHook('onSend', (request, reply, payload, done) => {
    t.assert.ok(request)
    t.assert.ok(request.raw)
    t.assert.ok(request.id)
    t.assert.ok(request.params)
    t.assert.ok(request.query)
    done()
  })
  fastify.post('/', (request, reply) => {
    reply.send(200)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'content-type': 'application/json'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      // a 400 error is expected because of no body
      t.assert.strictEqual(response.statusCode, 400)
      done()
    })
  })
})

test('request should be defined in onSend Hook on post request with content type application/x-www-form-urlencoded', (t, done) => {
  t.plan(7)
  const fastify = require('../..')()

  t.after(() => { fastify.close() })

  fastify.addHook('onSend', (request, reply, payload, done) => {
    t.assert.ok(request)
    t.assert.ok(request.raw)
    t.assert.ok(request.params)
    t.assert.ok(request.query)
    done()
  })
  fastify.post('/', (request, reply) => {
    reply.send(200)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      // a 415 error is expected because of missing content type parser
      t.assert.strictEqual(response.statusCode, 415)
      done()
    })
  })
})

test('request should be defined in onSend Hook on options request with content type application/x-www-form-urlencoded', (t, done) => {
  t.plan(7)
  const fastify = require('../..')()

  t.after(() => { fastify.close() })

  fastify.addHook('onSend', (request, reply, payload, done) => {
    t.assert.ok(request)
    t.assert.ok(request.raw)
    t.assert.ok(request.params)
    t.assert.ok(request.query)
    done()
  })
  fastify.options('/', (request, reply) => {
    reply.send(200)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'OPTIONS',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      // Body parsing skipped, so no body sent
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })
})

test('request should respond with an error if an unserialized payload is sent inside an async handler', (t, done) => {
  t.plan(3)

  const fastify = require('../..')()

  fastify.get('/', (request, reply) => {
    reply.type('text/html')
    return Promise.resolve(request.headers)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 500)
    t.assert.deepStrictEqual(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      code: 'FST_ERR_REP_INVALID_PAYLOAD_TYPE',
      message: 'Attempted to send payload of invalid type \'object\'. Expected a string or Buffer.',
      statusCode: 500
    })
    done()
  })
})
