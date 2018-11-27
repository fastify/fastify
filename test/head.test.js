'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

const schema = {
  schema: {
    response: {
      '2xx': {
        type: 'null'
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

test('shorthand - head', t => {
  t.plan(1)
  try {
    fastify.head('/', schema, function (req, reply) {
      reply.code(200).send(null)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - head params', t => {
  t.plan(1)
  try {
    fastify.head('/params/:foo/:test', paramsSchema, function (req, reply) {
      reply.send(null)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - head, querystring schema', t => {
  t.plan(1)
  try {
    fastify.head('/query', querySchema, function (req, reply) {
      reply.code(200).send(null)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('missing schema - head', t => {
  t.plan(1)
  try {
    fastify.head('/missing', function (req, reply) {
      reply.code(200).send(null)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('shorthand - request head', t => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })
  })

  test('shorthand - request head params schema', t => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/params/world/123'
    }, (err, response) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })
  })

  test('shorthand - request head params schema error', t => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/params/world/string'
    }, (err, response) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
    })
  })

  test('shorthand - request head querystring schema', t => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/query?hello=123'
    }, (err, response) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })
  })

  test('shorthand - request head querystring schema error', t => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/query?hello=world'
    }, (err, response) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
    })
  })

  test('shorthand - request head missing schema', t => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/missing'
    }, (err, response) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })
  })
})
