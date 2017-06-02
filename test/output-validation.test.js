'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const fastify = require('..')()

const schema = {
  response: {
    200: {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      }
    },
    '2xx': {
      type: 'object',
      properties: {
        hello: {
          type: 'number'
        }
      }
    }
  }
}

test('shorthand - output string', t => {
  t.plan(1)
  try {
    fastify.get('/string', schema, function (req, reply) {
      reply.code(200).send({ hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - output number', t => {
  t.plan(1)
  try {
    fastify.get('/number', schema, function (req, reply) {
      reply.code(201).send({ hello: 55 })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('wrong object for schema - output', t => {
  t.plan(1)
  try {
    fastify.get('/wrong-object-for-schema', schema, function (req, reply) {
      // will send { hello: null }
      reply.code(201).send({ hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('empty response', t => {
  t.plan(1)
  try {
    // no checks
    fastify.get('/empty', schema, function (req, reply) {
      reply.code(204).send()
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('shorthand - string get ok', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/string'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('shorthand - number get ok', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/number'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 201)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 55 })
    })
  })

  test('shorthand - wrong-object-for-schema', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/wrong-object-for-schema'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 201)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: null })
    })
  })
})
