'use strict'

const { test } = require('node:test')
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

test('shorthand - output string', t => {
  t.plan(1)
  try {
    fastify.get('/string', opts, function (req, reply) {
      reply.code(200).send({ hello: 'world' })
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('shorthand - output number', t => {
  t.plan(1)
  try {
    fastify.get('/number', opts, function (req, reply) {
      reply.code(201).send({ hello: 55 })
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('wrong object for schema - output', t => {
  t.plan(1)
  try {
    fastify.get('/wrong-object-for-schema', opts, function (req, reply) {
      // will send { }
      reply.code(201).send({ hello: 'world' })
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('empty response', t => {
  t.plan(1)
  try {
    // no checks
    fastify.get('/empty', opts, function (req, reply) {
      reply.code(204).send()
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('unlisted response code', t => {
  t.plan(1)
  try {
    fastify.get('/400', opts, function (req, reply) {
      reply.code(400).send({ hello: 'DOOM' })
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('start server and run tests', async (t) => {
  await fastify.listen({ port: 0 })
  const baseUrl = 'http://localhost:' + fastify.server.address().port
  t.after(() => fastify.close())

  function sgetAsync (opts) {
    return new Promise((resolve, reject) => {
      sget(opts, (err, res, body) => {
        if (err) return reject(err)
        resolve({ res, body })
      })
    })
  }

  await test('shorthand - string get ok', async (t) => {
    const { res, body } = await sgetAsync({ method: 'GET', url: `${baseUrl}/string` })
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers['content-length'], '' + body.length)
    t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
  })

  await test('shorthand - number get ok', async (t) => {
    const { res, body } = await sgetAsync({ method: 'GET', url: `${baseUrl}/number` })
    t.assert.strictEqual(res.statusCode, 201)
    t.assert.strictEqual(res.headers['content-length'], '' + body.length)
    t.assert.deepStrictEqual(JSON.parse(body), { hello: 55 })
  })

  await test('shorthand - wrong-object-for-schema', async (t) => {
    const { res, body } = await sgetAsync({ method: 'GET', url: `${baseUrl}/wrong-object-for-schema` })
    t.assert.strictEqual(res.statusCode, 500)
    t.assert.strictEqual(res.headers['content-length'], '' + body.length)
    t.assert.deepStrictEqual(JSON.parse(body), {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'The value "world" cannot be converted to a number.'
    })
  })

  await test('shorthand - empty', async (t) => {
    const { res } = await sgetAsync({ method: 'GET', url: `${baseUrl}/empty` })
    t.assert.strictEqual(res.statusCode, 204)
  })

  await test('shorthand - 400', async (t) => {
    const { res, body } = await sgetAsync({ method: 'GET', url: `${baseUrl}/400` })
    t.assert.strictEqual(res.statusCode, 400)
    t.assert.strictEqual(res.headers['content-length'], '' + body.length)
    t.assert.deepStrictEqual(JSON.parse(body), { hello: 'DOOM' })
  })
})
