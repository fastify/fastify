'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const fastify = require('../../fastify')()

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
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('shorthand - custom head', t => {
  t.plan(1)
  try {
    fastify.head('/proxy/*', function (req, reply) {
      reply.headers({ 'x-foo': 'bar' })
      reply.code(200).send(null)
    })

    fastify.get('/proxy/*', function (req, reply) {
      reply.code(200).send(null)
    })

    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('shorthand - custom head with constraints', t => {
  t.plan(1)
  try {
    fastify.head('/proxy/*', { constraints: { version: '1.0.0' } }, function (req, reply) {
      reply.headers({ 'x-foo': 'bar' })
      reply.code(200).send(null)
    })

    fastify.get('/proxy/*', { constraints: { version: '1.0.0' } }, function (req, reply) {
      reply.code(200).send(null)
    })

    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('shorthand - should not reset a head route', t => {
  t.plan(1)
  try {
    fastify.get('/query1', function (req, reply) {
      reply.code(200).send(null)
    })

    fastify.put('/query1', function (req, reply) {
      reply.code(200).send(null)
    })

    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('shorthand - should set get and head route in the same api call', t => {
  t.plan(1)
  try {
    fastify.route({
      method: ['HEAD', 'GET'],
      url: '/query4',
      handler: function (req, reply) {
        reply.headers({ 'x-foo': 'bar' })
        reply.code(200).send(null)
      }
    })

    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('shorthand - head params', t => {
  t.plan(1)
  try {
    fastify.head('/params/:foo/:test', paramsSchema, function (req, reply) {
      reply.send(null)
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('shorthand - head, querystring schema', t => {
  t.plan(1)
  try {
    fastify.head('/query', querySchema, function (req, reply) {
      reply.code(200).send(null)
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('missing schema - head', t => {
  t.plan(1)
  try {
    fastify.head('/missing', function (req, reply) {
      reply.code(200).send(null)
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('head test', async t => {
  t.after(() => { fastify.close() })
  await fastify.listen({ port: 0 })

  await t.test('shorthand - request head', (t, done) => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })

  await t.test('shorthand - request head params schema', (t, done) => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/params/world/123'
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })

  await t.test('shorthand - request head params schema error', (t, done) => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/params/world/string'
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 400)
      done()
    })
  })

  await t.test('shorthand - request head querystring schema', (t, done) => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/query?hello=123'
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })

  await t.test('shorthand - request head querystring schema error', (t, done) => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/query?hello=world'
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 400)
      done()
    })
  })

  await t.test('shorthand - request head missing schema', (t, done) => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/missing'
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })

  await t.test('shorthand - request head custom head', (t, done) => {
    t.plan(3)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/proxy/test'
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['x-foo'], 'bar')
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })

  await t.test('shorthand - request head custom head with constraints', (t, done) => {
    t.plan(3)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/proxy/test',
      headers: {
        version: '1.0.0'
      }
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['x-foo'], 'bar')
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })

  await t.test('shorthand - should not reset a head route', (t, done) => {
    t.plan(2)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/query1'
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })

  await t.test('shorthand - should set get and head route in the same api call', (t, done) => {
    t.plan(3)
    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/query4'
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['x-foo'], 'bar')
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })
})
