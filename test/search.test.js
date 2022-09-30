'use strict'

const t = require('tap')
const sget = require('simple-get').concat
const test = t.test
const fastify = require('..')()

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
    t.pass()
  } catch (e) {
    t.fail()
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
    t.pass()
  } catch (e) {
    t.fail()
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
    t.pass()
  } catch (e) {
    t.fail()
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
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen({ port: 0 }, err => {
  t.error(err)
  t.teardown(() => { fastify.close() })

  const url = `http://localhost:${fastify.server.address().port}`

  test('request - search', t => {
    t.plan(4)
    sget({
      method: 'SEARCH',
      url
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })

  test('request search params schema', t => {
    t.plan(4)
    sget({
      method: 'SEARCH',
      url: `${url}/params/world/123`
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { foo: 'world', test: 123 })
    })
  })

  test('request search params schema error', t => {
    t.plan(3)
    sget({
      method: 'SEARCH',
      url: `${url}/params/world/string`
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 400)
      t.same(JSON.parse(body), {
        error: 'Bad Request',
        message: 'params/test must be integer',
        statusCode: 400
      })
    })
  })

  test('request search querystring schema', t => {
    t.plan(4)
    sget({
      method: 'SEARCH',
      url: `${url}/query?hello=123`
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 123 })
    })
  })

  test('request search querystring schema error', t => {
    t.plan(3)
    sget({
      method: 'SEARCH',
      url: `${url}/query?hello=world`
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 400)
      t.same(JSON.parse(body), {
        error: 'Bad Request',
        message: 'querystring/hello must be integer',
        statusCode: 400
      })
    })
  })

  test('request search body schema', t => {
    t.plan(4)
    const replyBody = { foo: 'bar', test: 5 }
    sget({
      method: 'SEARCH',
      url: `${url}/body`,
      body: JSON.stringify(replyBody),
      headers: { 'content-type': 'application/json' }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), replyBody)
    })
  })

  test('request search body schema error', t => {
    t.plan(4)
    sget({
      method: 'SEARCH',
      url: `${url}/body`,
      body: JSON.stringify({ foo: 'bar', test: 'test' }),
      headers: { 'content-type': 'application/json' }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 400)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), {
        error: 'Bad Request',
        message: 'body/test must be integer',
        statusCode: 400
      })
    })
  })
})
