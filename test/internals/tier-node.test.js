/* eslint-disable no-useless-return */
'use strict'

const t = require('tap')
const test = t.test

const internals = require('../../lib/tier-node')[Symbol.for('internals')]
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')
const buildSchema = require('../../lib/validation').build
const hooksManager = require('../../lib/hooks')
const hooks = hooksManager().get

test('Request object', t => {
  t.plan(6)
  const req = new Request('params', { log: null }, 'body', 'query')
  t.type(req, Request)
  t.equal(req.params, 'params')
  t.deepEqual(req.req, { log: null })
  t.equal(req.body, 'body')
  t.equal(req.query, 'query')
  t.equal(req.log, null)
})

test('bodyParsed function', t => {
  t.plan(1)
  const parsed = internals.bodyParsed(hooks, null, null, null, null)
  t.is(typeof parsed, 'function')
})

test('handler function - missing handler', t => {
  t.plan(2)
  const res = {}
  res.end = () => {
    t.equal(res.statusCode, 404)
    t.pass()
  }
  internals.handler(hooks, null, null, null, res, null, null)
})

test('handler function - invalid schema', t => {
  t.plan(2)
  const res = {}
  res.end = () => {
    t.equal(res.statusCode, 400)
    t.pass()
  }
  const handle = {
    schema: {
      payload: {
        type: 'object',
        properties: {
          hello: { type: 'number' }
        }
      }
    },
    handler: () => {},
    Reply: Reply()
  }
  buildSchema(handle)
  internals.handler(hooks, handle, null, null, res, { hello: 'world' }, null)
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
      reply.send(null)
    },
    Reply: Reply()
  }
  buildSchema(handle)
  internals.handler(hooks, handle, null, { log: null }, res, null, null)
})

test('routerHandler function - return a function', t => {
  t.plan(1)
  const handle = internals.routerHandler({})
  t.is(typeof handle, 'function')
})

test('routerHandler function - missing handle', t => {
  t.plan(2)
  const handle = internals.routerHandler({}, hooks)
  const res = {}
  res.end = () => {
    t.equal(res.statusCode, 404)
    t.pass()
  }
  const req = {
    method: 'GET'
  }
  handle(null, req, res)
})

test('routerHandler function - unhandled method', t => {
  t.plan(2)
  const handle = internals.routerHandler({
    'SAD': {}
  }, hooks)
  const res = {}
  res.end = () => {
    t.equal(res.statusCode, 404)
    t.pass()
  }
  const req = {
    method: 'SAD'
  }
  handle(null, req, res)
})

test('routerHandler function - call handle', t => {
  t.plan(3)
  const handleNode = {
    handler: (req, reply) => {
      t.equal(req.req.url, 'http://example.com')
      reply.send(null)
    },
    Reply: Reply()
  }
  buildSchema(handleNode)

  const handle = internals.routerHandler({
    'GET': handleNode
  }, hooks)
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
  const req = {
    method: 'GET',
    url: 'http://example.com'
  }
  handle(null, req, res)
})

test('reply function - error 500', t => {
  t.plan(3)
  const handleNode = {
    handler: (req, reply) => {
      t.equal(req.req.url, 'http://example.com')
      reply.send(new Error('error'))
    },
    Reply: Reply()
  }
  buildSchema(handleNode)

  const handle = internals.routerHandler({
    'GET': handleNode
  }, hooks)
  const res = {}
  res.end = () => {
    t.equal(res.statusCode, 500)
    t.pass()
  }
  const req = {
    method: 'GET',
    url: 'http://example.com',
    log: {
      error: () => {}
    }
  }
  handle(null, req, res)
})
