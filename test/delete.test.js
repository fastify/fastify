'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const sget = require('simple-get').concat
const fastify = require('..')()

const schema = {
  schema: {
    response: {
      '2xx': {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      }
    }
  }
}

const querySchema = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        hello: {
          type: 'integer'
        }
      }
    }
  }
}

const paramsSchema = {
  schema: {
    params: {
      type: 'object',
      properties: {
        foo: {
          type: 'string'
        },
        test: {
          type: 'integer'
        }
      }
    }
  }
}

const headersSchema = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        'x-test': {
          type: 'number'
        }
      }
    }
  }
}

const bodySchema = {
  schema: {
    body: {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      }
    },
    response: {
      '2xx': {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      }
    }
  }
}

test('shorthand - delete', (t, done) => {
  t.plan(1)
  try {
    fastify.delete('/', schema, function (req, reply) {
      reply.code(200).send({ hello: 'world' })
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  } finally {
    done()
  }
})

test('shorthand - delete params', t => {
  t.plan(1)
  try {
    fastify.delete('/params/:foo/:test', paramsSchema, function (req, reply) {
      reply.code(200).send(req.params)
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('shorthand - delete, querystring schema', t => {
  t.plan(1)
  try {
    fastify.delete('/query', querySchema, function (req, reply) {
      reply.send(req.query)
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('shorthand - get, headers schema', t => {
  t.plan(1)
  try {
    fastify.delete('/headers', headersSchema, function (req, reply) {
      reply.code(200).send(req.headers)
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('missing schema - delete', t => {
  t.plan(1)
  try {
    fastify.delete('/missing', function (req, reply) {
      reply.code(200).send({ hello: 'world' })
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('body - delete', t => {
  t.plan(1)
  try {
    fastify.delete('/body', bodySchema, function (req, reply) {
      reply.send(req.body)
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

fastify.listen({ port: 0 }, err => {
  assert.ifError(err)
  test.after(() => { fastify.close() })

  test('shorthand - request delete', (t, done) => {
    t.plan(4)
    sget({
      method: 'DELETE',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      done()
    })
  })

  test('shorthand - request delete params schema', (t, done) => {
    t.plan(4)
    sget({
      method: 'DELETE',
      url: 'http://localhost:' + fastify.server.address().port + '/params/world/123'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { foo: 'world', test: 123 })
      done()
    })
  })

  test('shorthand - request delete params schema error', (t, done) => {
    t.plan(3)
    sget({
      method: 'DELETE',
      url: 'http://localhost:' + fastify.server.address().port + '/params/world/string'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 400)
      t.assert.deepStrictEqual(JSON.parse(body), {
        error: 'Bad Request',
        code: 'FST_ERR_VALIDATION',
        message: 'params/test must be integer',
        statusCode: 400
      })
      done()
    })
  })

  test('shorthand - request delete headers schema', (t, done) => {
    t.plan(4)
    sget({
      method: 'DELETE',
      headers: {
        'x-test': 1
      },
      url: 'http://localhost:' + fastify.server.address().port + '/headers'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.strictEqual(JSON.parse(body)['x-test'], 1)
      done()
    })
  })

  test('shorthand - request delete headers schema error', (t, done) => {
    t.plan(3)
    sget({
      method: 'DELETE',
      headers: {
        'x-test': 'abc'
      },
      url: 'http://localhost:' + fastify.server.address().port + '/headers'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 400)
      t.assert.deepStrictEqual(JSON.parse(body), {
        error: 'Bad Request',
        code: 'FST_ERR_VALIDATION',
        message: 'headers/x-test must be number',
        statusCode: 400
      })
      done()
    })
  })

  test('shorthand - request delete querystring schema', (t, done) => {
    t.plan(4)
    sget({
      method: 'DELETE',
      url: 'http://localhost:' + fastify.server.address().port + '/query?hello=123'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: 123 })
      done()
    })
  })

  test('shorthand - request delete querystring schema error', (t, done) => {
    t.plan(3)
    sget({
      method: 'DELETE',
      url: 'http://localhost:' + fastify.server.address().port + '/query?hello=world'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 400)
      t.assert.deepStrictEqual(JSON.parse(body), {
        error: 'Bad Request',
        code: 'FST_ERR_VALIDATION',
        message: 'querystring/hello must be integer',
        statusCode: 400
      })
      done()
    })
  })

  test('shorthand - request delete missing schema', (t, done) => {
    t.plan(4)
    sget({
      method: 'DELETE',
      url: 'http://localhost:' + fastify.server.address().port + '/missing'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      done()
    })
  })

  test('shorthand - delete with body', (t, done) => {
    t.plan(3)
    sget({
      method: 'DELETE',
      url: 'http://localhost:' + fastify.server.address().port + '/body',
      body: {
        hello: 'world'
      },
      json: true
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(body, { hello: 'world' })
      done()
    })
  })
})

test('shorthand - delete with application/json Content-Type header and null body', (t, done) => {
  t.plan(4)
  const fastify = require('..')()
  fastify.delete('/', {}, (req, reply) => {
    t.assert.strictEqual(req.body, null)
    reply.send(req.body)
  })
  fastify.inject({
    method: 'DELETE',
    url: '/',
    headers: { 'Content-Type': 'application/json' },
    body: 'null'
  }, (err, response) => {
    t.assert.ifError(err)
    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.payload.toString(), 'null')
    done()
  })
})

// https://github.com/fastify/fastify/issues/936
// Skip this test because this is an invalid request
test('shorthand - delete with application/json Content-Type header and without body', { skip: 'https://github.com/fastify/fastify/pull/5419' }, t => {
  t.plan(4)
  const fastify = require('..')()
  fastify.delete('/', {}, (req, reply) => {
    t.assert.strictEqual(req.body, undefined)
    reply.send(req.body)
  })
  fastify.inject({
    method: 'DELETE',
    url: '/',
    headers: { 'Content-Type': 'application/json' },
    body: null
  }, (err, response) => {
    t.assert.ifError(err)
    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.payload.toString(), '')
  })
})
