/* eslint-disable no-useless-return */
'use strict'

const t = require('tap')
const test = t.test
const internals = require('../../lib/handleRequest')[Symbol.for('internals')]
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')
const buildSchema = require('../../lib/validation').build
const Hooks = require('../../lib/hooks')

const Ajv = require('ajv')
const ajv = new Ajv({ coerceTypes: true })

function schemaCompiler (schema) {
  const validateFuncion = ajv.compile(schema)
  return function (body) {
    const isOk = validateFuncion(body)
    if (isOk) return
    return { error: new Error('Invalid body') }
  }
}

test('Request object', t => {
  t.plan(7)
  const req = new Request('params', 'req', 'body', 'query', 'headers', 'log')
  t.type(req, Request)
  t.equal(req.params, 'params')
  t.deepEqual(req.req, 'req')
  t.equal(req.body, 'body')
  t.equal(req.query, 'query')
  t.equal(req.headers, 'headers')
  t.equal(req.log, 'log')
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
  const handle = {
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
    hooks: new Hooks()
  }
  buildSchema(handle, schemaCompiler)
  internals.handler(handle, null, { log: { error: () => {} } }, res, { hello: 'world' }, null)
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
  const handle = {
    handler: (req, reply) => {
      t.is(typeof reply, 'object')
      reply.code(204)
      reply.send(undefined)
    },
    Reply: Reply,
    Request: Request,
    preHandler: new Hooks().preHandler
  }
  buildSchema(handle, schemaCompiler)
  internals.handler(handle, null, { log: null }, res, null, null)
})

test('jsonBody and jsonBodyParsed should be functions', t => {
  t.plan(4)

  t.is(typeof internals.jsonBody, 'function')
  t.is(internals.jsonBody.length, 4)

  t.is(typeof internals.jsonBodyParsed, 'function')
  t.is(internals.jsonBodyParsed.length, 6)
})

test('jsonBody error handler', t => {
  t.plan(1)

  try {
    internals.jsonBody({ on: 'error' }, {})
    t.fail('jsonBody error')
  } catch (e) {
    t.pass('jsonBody error')
  }
})
