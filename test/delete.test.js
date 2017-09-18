'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
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

test('shorthand - delete', t => {
  t.plan(1)
  try {
    fastify.delete('/', schema, function (req, reply) {
      reply.code(200).send({ hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - delete params', t => {
  t.plan(1)
  try {
    fastify.delete('/params/:foo/:test', paramsSchema, function (req, reply) {
      reply.code(200).send(req.params)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - delete, querystring schema', t => {
  t.plan(1)
  try {
    fastify.delete('/query', querySchema, function (req, reply) {
      reply.send(req.query)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - get, headers schema', t => {
  t.plan(1)
  try {
    fastify.delete('/headers', headersSchema, function (req, reply) {
      reply.code(200).send(req.headers)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('missing schema - delete', t => {
  t.plan(1)
  try {
    fastify.delete('/missing', function (req, reply) {
      reply.code(200).send({ hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('shorthand - request delete', t => {
    t.plan(4)
    request({
      method: 'DELETE',
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('shorthand - request delete params schema', t => {
    t.plan(4)
    request({
      method: 'DELETE',
      uri: 'http://localhost:' + fastify.server.address().port + '/params/world/123'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { foo: 'world', test: 123 })
    })
  })

  test('shorthand - request delete params schema error', t => {
    t.plan(3)
    request({
      method: 'DELETE',
      uri: 'http://localhost:' + fastify.server.address().port + '/params/world/string'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
      t.deepEqual(JSON.parse(body), {
        error: 'Bad Request',
        message: JSON.stringify([{
          keyword: 'type',
          dataPath: '.test',
          schemaPath: '#/properties/test/type',
          params: { type: 'integer' },
          message: 'should be integer'
        }]),
        statusCode: 400
      })
    })
  })

  test('shorthand - request delete headers schema', t => {
    t.plan(4)
    request({
      method: 'DELETE',
      headers: {
        'x-test': 1
      },
      uri: 'http://localhost:' + fastify.server.address().port + '/headers'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.strictEqual(JSON.parse(body)['x-test'], 1)
    })
  })

  test('shorthand - request delete headers schema error', t => {
    t.plan(3)
    request({
      method: 'DELETE',
      headers: {
        'x-test': 'abc'
      },
      uri: 'http://localhost:' + fastify.server.address().port + '/headers'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
      t.deepEqual(JSON.parse(body), {
        error: 'Bad Request',
        message: JSON.stringify([{
          keyword: 'type',
          dataPath: '[\'x-test\']',
          schemaPath: '#/properties/x-test/type',
          params: { type: 'number' },
          message: 'should be number'
        }]),
        statusCode: 400
      })
    })
  })

  test('shorthand - request delete querystring schema', t => {
    t.plan(4)
    request({
      method: 'DELETE',
      uri: 'http://localhost:' + fastify.server.address().port + '/query?hello=123'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 123 })
    })
  })

  test('shorthand - request delete querystring schema error', t => {
    t.plan(3)
    request({
      method: 'DELETE',
      uri: 'http://localhost:' + fastify.server.address().port + '/query?hello=world'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
      t.deepEqual(JSON.parse(body), {
        error: 'Bad Request',
        message: JSON.stringify([{
          keyword: 'type',
          dataPath: '.hello',
          schemaPath: '#/properties/hello/type',
          params: { type: 'integer' },
          message: 'should be integer'
        }]),
        statusCode: 400
      })
    })
  })

  test('shorthand - request delete missing schema', t => {
    t.plan(4)
    request({
      method: 'DELETE',
      uri: 'http://localhost:' + fastify.server.address().port + '/missing'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})
