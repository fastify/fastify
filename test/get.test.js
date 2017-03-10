'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const fastify = require('..')()

const schema = {
  out: {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    }
  }
}

const numberSchema = {
  out: {
    type: 'object',
    properties: {
      hello: {
        type: 'number'
      }
    }
  }
}

const querySchema = {
  querystring: {
    type: 'object',
    properties: {
      hello: {
        type: 'integer'
      }
    }
  }
}

const paramsSchema = {
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

test('shorthand - get', t => {
  t.plan(1)
  try {
    fastify.get('/', schema, function (req, reply) {
      reply.code(200).send({ hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - get params', t => {
  t.plan(1)
  try {
    fastify.get('/params/:foo/:test', paramsSchema, function (req, reply) {
      reply.code(200).send(req.params)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - get, querystring schema', t => {
  t.plan(1)
  try {
    fastify.get('/query', querySchema, function (req, reply) {
      reply.code(200).send(req.query)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('missing schema - get', t => {
  t.plan(1)
  try {
    fastify.get('/missing', function (req, reply) {
      reply.code(200).send({ hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('wrong object for schema - get', t => {
  t.plan(1)
  try {
    fastify.get('/wrong-object-for-schema', numberSchema, function (req, reply) {
      // will send { hello: null }
      reply.code(200).send({ hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('Avoid the schema serializer - get', t => {
  t.plan(1)
  try {
    fastify.get('/avoid-schema', numberSchema, function (req, reply) {
      reply.code(200).send({ hello: 'world' }, false)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('shorthand - request get', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('shorthand - request get params schema', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/params/world/123'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { foo: 'world', test: 123 })
    })
  })

  test('shorthand - request get params schema error', t => {
    t.plan(3)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/params/world/string'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
      t.deepEqual(JSON.parse(body)[0], {
        keyword: 'type',
        dataPath: '.test',
        schemaPath: '#/properties/test/type',
        params: { type: 'integer' },
        message: 'should be integer'
      })
    })
  })

  test('shorthand - request get querystring schema', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/query?hello=123'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 123 })
    })
  })

  test('shorthand - request get querystring schema error', t => {
    t.plan(3)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/query?hello=world'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
      t.deepEqual(JSON.parse(body)[0], {
        keyword: 'type',
        dataPath: '.hello',
        schemaPath: '#/properties/hello/type',
        params: { type: 'integer' },
        message: 'should be integer'
      })
    })
  })

  test('shorthand - request get missing schema', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/missing'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('shorthand - request get missing schema', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/wrong-object-for-schema'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: null })
    })
  })

  test('shorthand - avoid the schema serializer', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/avoid-schema'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})
