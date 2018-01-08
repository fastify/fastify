/* eslint-disable no-useless-return */
'use strict'

const t = require('tap')
const test = t.test
const internals = require('../../lib/handleRequest')[Symbol.for('internals')]
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')
const buildSchema = require('../../lib/validation').build
const Hooks = require('../../lib/hooks')
const runHooks = require('fast-iterator')
const sget = require('simple-get').concat

const Ajv = require('ajv')
const ajv = new Ajv({ coerceTypes: true })

function schemaCompiler (schema) {
  const validateFuncion = ajv.compile(schema)
  var fn = function (body) {
    const isOk = validateFuncion(body)
    if (isOk) return
    return false
  }
  fn.errors = []
  return fn
}

test('Request object', t => {
  t.plan(7)
  const req = new Request('params', 'req', 'query', 'headers', 'log')
  t.type(req, Request)
  t.equal(req.params, 'params')
  t.deepEqual(req.req, 'req')
  t.equal(req.query, 'query')
  t.equal(req.headers, 'headers')
  t.equal(req.log, 'log')
  t.equal(req.body, null)
})

test('handler function - invalid schema', t => {
  t.plan(2)
  const res = {}
  res.end = () => {
    t.equal(res.statusCode, 400)
    t.pass()
  }
  res.setHeader = (key, value) => {
    return
  }
  res.getHeader = (key) => {
    return
  }
  const context = {
    schema: {
      body: {
        type: 'object',
        properties: {
          hello: { type: 'number' }
        }
      }
    },
    handler: () => {},
    Reply: Reply,
    Request: Request,
    preHandler: runHooks(new Hooks().preHandler, {}),
    onSend: runHooks(new Hooks().onSend, {})
  }
  buildSchema(context, schemaCompiler)
  const request = {
    log: { error: () => {}, info: () => {} },
    body: { hello: 'world' }
  }
  internals.handler(new Reply(res, context, request))
})

test('handler function - reply', t => {
  t.plan(3)
  const res = {}
  res.end = () => {
    t.equal(res.statusCode, 204)
    t.pass()
  }
  res.getHeader = (key) => {
    return false
  }
  res.setHeader = (key, value) => {
    return
  }
  const context = {
    handler: (req, reply) => {
      t.is(typeof reply, 'object')
      reply.code(204)
      reply.send(undefined)
    },
    Reply: Reply,
    Request: Request,
    preHandler: runHooks(new Hooks().preHandler, {}),
    onSend: runHooks(new Hooks().onSend, {})
  }
  buildSchema(context, schemaCompiler)
  internals.handler(new Reply(res, context, {}))
})

test('jsonBody should be a function', t => {
  t.plan(2)

  t.is(typeof internals.jsonBody, 'function')
  t.is(internals.jsonBody.length, 3)
})

test('request should be defined in onSend Hook on post request with content type application/json', t => {
  t.plan(7)
  const fastify = require('../..')()

  fastify.addHook('onSend', (request, reply, payload, done) => {
    t.ok(request)
    t.ok(request.req)
    t.ok(request.params)
    t.ok(request.query)
    done()
  })
  fastify.post('/', (request, reply) => {
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'content-type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      // a 422 error is expected because of no body
      t.strictEqual(response.statusCode, 422)
    })
  })
})

test('request should be defined in onSend Hook on post request with content type application/x-www-form-urlencoded', t => {
  t.plan(7)
  const fastify = require('../..')()

  fastify.addHook('onSend', (request, reply, payload, done) => {
    t.ok(request)
    t.ok(request.req)
    t.ok(request.params)
    t.ok(request.query)
    done()
  })
  fastify.post('/', (request, reply) => {
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    }, (err, response, body) => {
      t.error(err)
      // a 415 error is expected because of missing content type parser
      t.strictEqual(response.statusCode, 415)
    })
  })
})

test('request should be defined in onSend Hook on options request with content type application/x-www-form-urlencoded', t => {
  t.plan(7)
  const fastify = require('../..')()

  fastify.addHook('onSend', (request, reply, payload, done) => {
    t.ok(request)
    t.ok(request.req)
    t.ok(request.params)
    t.ok(request.query)
    done()
  })
  fastify.options('/', (request, reply) => {
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    sget({
      method: 'OPTIONS',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    }, (err, response, body) => {
      t.error(err)
      // a 415 error is expected because of missing content type parser
      t.strictEqual(response.statusCode, 415)
    })
  })
})
