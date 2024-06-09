'use strict'

const { test } = require('tap')
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
  t.equal(res, undefined)
})

test('handleRequest function - invoke with error', t => {
  t.plan(1)
  const request = {}
  const reply = {}
  reply.send = (err) => t.equal(err.message, 'Kaboom')
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
    errorHandler: { func: () => { t.pass('errorHandler called') } },
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
    t.equal(res.statusCode, 204)
    t.pass()
  }
  res.writeHead = () => {}
  const context = {
    handler: (req, reply) => {
      t.equal(typeof reply, 'object')
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
    t.fail()
  }
  res.writeHead = () => {}
  const context = {
    handler: (req, reply) => {
      t.fail()
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

test('request should be defined in onSend Hook on post request with content type application/json', t => {
  t.plan(8)
  const fastify = require('../..')()

  fastify.addHook('onSend', (request, reply, payload, done) => {
    t.ok(request)
    t.ok(request.raw)
    t.ok(request.id)
    t.ok(request.params)
    t.ok(request.query)
    done()
  })
  fastify.post('/', (request, reply) => {
    reply.send(200)
  })
  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'content-type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      // a 400 error is expected because of no body
      t.equal(response.statusCode, 400)
    })
  })
})

test('request should be defined in onSend Hook on post request with content type application/x-www-form-urlencoded', t => {
  t.plan(7)
  const fastify = require('../..')()

  fastify.addHook('onSend', (request, reply, payload, done) => {
    t.ok(request)
    t.ok(request.raw)
    t.ok(request.params)
    t.ok(request.query)
    done()
  })
  fastify.post('/', (request, reply) => {
    reply.send(200)
  })
  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    }, (err, response, body) => {
      t.error(err)
      // a 415 error is expected because of missing content type parser
      t.equal(response.statusCode, 415)
    })
  })
})

test('request should be defined in onSend Hook on options request with content type application/x-www-form-urlencoded', t => {
  t.plan(7)
  const fastify = require('../..')()

  fastify.addHook('onSend', (request, reply, payload, done) => {
    t.ok(request)
    t.ok(request.raw)
    t.ok(request.params)
    t.ok(request.query)
    done()
  })
  fastify.options('/', (request, reply) => {
    reply.send(200)
  })
  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'OPTIONS',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    }, (err, response, body) => {
      t.error(err)
      // Body parsing skipped, so no body sent
      t.equal(response.statusCode, 200)
    })
  })
})

test('request should respond with an error if an unserialized payload is sent inside an async handler', t => {
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
    t.error(err)
    t.equal(res.statusCode, 500)
    t.strictSame(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      code: 'FST_ERR_REP_INVALID_PAYLOAD_TYPE',
      message: 'Attempted to send payload of invalid type \'object\'. Expected a string or Buffer.',
      statusCode: 500
    })
  })
})
