'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

const opts = {
  schema: {
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
}

fastify.addSchema({
  $id: 'defs',
  definitions: {
    error: {
      type: 'object',
      properties: {
        msg: { type: 'string' }
      }
    },
    200: {
      type: 'object',
      properties: {
        str: { type: 'string' }
      }
    },
    '4xx': {
      type: 'object',
      properties: {
        err: { $ref: 'defs#/definitions/error' }
      }
    },
    '5xx': {
      type: 'object',
      properties: {
        err: { $ref: 'defs#/definitions/error' },
        stack: { type: 'string' }
      }
    }
  }
})

const referenceOpts = {
  schema: {
    response: {
      200: 'defs#/definitions/200',
      '4xx': 'defs#/definitions/4xx',
      '5xx': 'defs#/definitions/5xx'
    }
  }
}

const deepReferenceOpts = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          obj: { $ref: 'defs#/definitions/200' }
        }
      }
    }
  }
}

test('shorthand - output string', t => {
  t.plan(1)
  try {
    fastify.get('/string', opts, function (req, reply) {
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
    fastify.get('/number', opts, function (req, reply) {
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
    fastify.get('/wrong-object-for-schema', opts, function (req, reply) {
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
    fastify.get('/empty', opts, function (req, reply) {
      reply.code(204).send()
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('unlisted response code', t => {
  t.plan(1)
  try {
    fastify.get('/400', opts, function (req, reply) {
      reply.code(400).send({ hello: 'DOOM' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('reference - 200', t => {
  t.plan(1)
  try {
    fastify.get('/reference/200', referenceOpts, function (req, reply) {
      reply.code(200).send({ str: 'TEST' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('deep reference - 200', t => {
  t.plan(1)
  try {
    fastify.get('/reference/deep', deepReferenceOpts, function (req, reply) {
      reply.code(200).send({ obj: { str: 'TEST' } })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('reference - 400', t => {
  t.plan(1)
  try {
    fastify.get('/reference/400', referenceOpts, function (req, reply) {
      reply.code(400).send({ err: { msg: 'Bad Request' } })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('reference - 500', t => {
  t.plan(1)
  try {
    fastify.get('/reference/500', referenceOpts, function (req, reply) {
      reply.code(500).send({ err: { msg: 'Internal Server Error' }, stack: '<test stack trace>' })
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
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/string'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('shorthand - number get ok', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/number'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 201)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 55 })
    })
  })

  test('shorthand - wrong-object-for-schema', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/wrong-object-for-schema'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 201)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: null })
    })
  })

  test('shorthand - empty', t => {
    t.plan(2)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/empty'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 204)
    })
  })

  test('shorthand - 400', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/400'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'DOOM' })
    })
  })

  test('reference shorthand - 200', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/reference/200'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), { str: 'TEST' })
    })
  })

  test('deep reference shorthand - 200', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/reference/deep'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), { obj: { str: 'TEST' } })
    })
  })

  test('reference shorthand - 400', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/reference/400'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
      t.deepEqual(JSON.parse(body), { err: { msg: 'Bad Request' } })
    })
  })

  test('reference shorthand - 500', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/reference/500'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
      t.deepEqual(JSON.parse(body), { err: { msg: 'Internal Server Error' }, stack: '<test stack trace>' })
    })
  })
})
