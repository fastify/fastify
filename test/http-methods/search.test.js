'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const fastify = require('../../fastify')()
fastify.addHttpMethod('SEARCH', { hasBody: true })

const schema = {
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

const bodySchema = {
  body: {
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

test('search', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'SEARCH',
      url: '/',
      schema,
      handler: function (request, reply) {
        reply.code(200).send({ hello: 'world' })
      }
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('search, params schema', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'SEARCH',
      url: '/params/:foo/:test',
      schema: paramsSchema,
      handler: function (request, reply) {
        reply.code(200).send(request.params)
      }
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('search, querystring schema', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'SEARCH',
      url: '/query',
      schema: querySchema,
      handler: function (request, reply) {
        reply.code(200).send(request.query)
      }
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('search, body schema', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'SEARCH',
      url: '/body',
      schema: bodySchema,
      handler: function (request, reply) {
        reply.code(200).send(request.body)
      }
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('search test', async t => {
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })
  const url = `http://localhost:${fastify.server.address().port}`

  await t.test('request - search', (t, done) => {
    t.plan(4)
    sget({
      method: 'SEARCH',
      url
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      done()
    })
  })

  await t.test('request search params schema', (t, done) => {
    t.plan(4)
    sget({
      method: 'SEARCH',
      url: `${url}/params/world/123`
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { foo: 'world', test: 123 })
      done()
    })
  })

  await t.test('request search params schema error', (t, done) => {
    t.plan(3)
    sget({
      method: 'SEARCH',
      url: `${url}/params/world/string`
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

  await t.test('request search querystring schema', (t, done) => {
    t.plan(4)
    sget({
      method: 'SEARCH',
      url: `${url}/query?hello=123`
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: 123 })
      done()
    })
  })

  await t.test('request search querystring schema error', (t, done) => {
    t.plan(3)
    sget({
      method: 'SEARCH',
      url: `${url}/query?hello=world`
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

  await t.test('request search body schema', (t, done) => {
    t.plan(4)
    const replyBody = { foo: 'bar', test: 5 }
    sget({
      method: 'SEARCH',
      url: `${url}/body`,
      body: JSON.stringify(replyBody),
      headers: { 'content-type': 'application/json' }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), replyBody)
      done()
    })
  })

  await t.test('request search body schema error', (t, done) => {
    t.plan(4)
    sget({
      method: 'SEARCH',
      url: `${url}/body`,
      body: JSON.stringify({ foo: 'bar', test: 'test' }),
      headers: { 'content-type': 'application/json' }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 400)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), {
        error: 'Bad Request',
        code: 'FST_ERR_VALIDATION',
        message: 'body/test must be integer',
        statusCode: 400
      })
      done()
    })
  })
})
