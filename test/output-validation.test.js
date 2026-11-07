'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const { kSchemaController, kOptions } = require('../lib/symbols')
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
  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => fastify.close())

  await test('shorthand - string get ok', async (t) => {
    const result = await fetch(fastifyServer + '/string')
    t.assert.ok(result.ok)
    t.assert.strictEqual(result.status, 200)
    const body = await result.text()
    t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
    t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
  })

  await test('shorthand - number get ok', async (t) => {
    const result = await fetch(fastifyServer + '/number')
    t.assert.ok(result.ok)
    t.assert.strictEqual(result.status, 201)
    const body = await result.text()
    t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
    t.assert.deepStrictEqual(JSON.parse(body), { hello: 55 })
  })

  await test('shorthand - wrong-object-for-schema', async (t) => {
    const result = await fetch(fastifyServer + '/wrong-object-for-schema')
    t.assert.ok(!result.ok)
    t.assert.strictEqual(result.status, 500)
    const body = await result.text()
    t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
    t.assert.deepStrictEqual(JSON.parse(body), {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'The value "world" cannot be converted to a number.'
    })
  })

  await test('shorthand - empty', async (t) => {
    const result = await fetch(fastifyServer + '/empty')
    t.assert.ok(result.ok)
    t.assert.strictEqual(result.status, 204)
  })

  await test('shorthand - 400', async (t) => {
    const result = await fetch(fastifyServer + '/400')
    t.assert.ok(!result.ok)
    t.assert.strictEqual(result.status, 400)
    const body = await result.text()
    t.assert.strictEqual(result.headers.get('content-length'), '' + body.length)
    t.assert.deepStrictEqual(JSON.parse(body), { hello: 'DOOM' })
  })
})

test('the output pool is seeded with the shared schema documents', async t => {
  const calls = []
  const fastify = Fastify({
    schemaController: {
      compilersFactory: {
        buildOutputValidator (externalSchemas, outputValidatorOptions) {
          calls.push({ externalSchemas, outputValidatorOptions })
          return () => () => true
        }
      }
    }
  })
  t.after(() => fastify.close())

  fastify.addSchema({
    $id: 'shared',
    type: 'object',
    properties: { hello: { type: 'string' } }
  })

  const controller = fastify[kSchemaController]
  controller.setupOutputValidator(fastify[kOptions])

  t.assert.strictEqual(calls.length, 1)
  t.assert.ok(calls[0].externalSchemas.shared, 'the shared document is part of the pool')
  t.assert.strictEqual(calls[0].externalSchemas.shared.$id, 'shared')
  t.assert.deepStrictEqual(calls[0].externalSchemas.shared.properties, { hello: { type: 'string' } })
})

test('the output pool receives the user outputValidatorOptions', async t => {
  const calls = []
  const fastify = Fastify({
    schemaController: {
      outputValidatorOptions: {
        customOptions: { strict: true }
      },
      compilersFactory: {
        buildOutputValidator (externalSchemas, outputValidatorOptions) {
          calls.push({ externalSchemas, outputValidatorOptions })
          return () => () => true
        }
      }
    }
  })
  t.after(() => fastify.close())

  const controller = fastify[kSchemaController]
  controller.setupOutputValidator(fastify[kOptions])

  t.assert.strictEqual(calls.length, 1)
  t.assert.deepStrictEqual(calls[0].outputValidatorOptions, { customOptions: { strict: true } })
})

test('the output pool does not lint the response schema by default', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  const controller = fastify[kSchemaController]
  controller.setupOutputValidator(fastify[kOptions])

  t.assert.doesNotThrow(() => controller.outputValidatorCompiler({
    schema: { type: 'object', whatever: 'need to be parsed by the custom serializer' },
    url: '/',
    method: 'GET',
    httpStatus: '200'
  }))
})

test('the user customOptions win over the framework defaults', async t => {
  const fastify = Fastify({
    schemaController: {
      outputValidatorOptions: {
        customOptions: { strict: true }
      }
    }
  })
  t.after(() => fastify.close())

  const controller = fastify[kSchemaController]
  controller.setupOutputValidator(fastify[kOptions])

  t.assert.throws(() => controller.outputValidatorCompiler({
    schema: { type: 'object', whatever: 'need to be parsed by the custom serializer' },
    url: '/',
    method: 'GET',
    httpStatus: '200'
  }))
})

test('the output pool is built once', async t => {
  const calls = []
  const fastify = Fastify({
    schemaController: {
      compilersFactory: {
        buildOutputValidator (externalSchemas, outputValidatorOptions) {
          calls.push({ externalSchemas, outputValidatorOptions })
          return () => () => true
        }
      }
    }
  })
  t.after(() => fastify.close())

  const controller = fastify[kSchemaController]
  controller.setupOutputValidator(fastify[kOptions])
  controller.setupOutputValidator(fastify[kOptions])

  t.assert.strictEqual(calls.length, 1)
})

test('a route without a response schema does not build the output pool', async t => {
  let calls = 0
  const fastify = Fastify({
    schemaController: {
      compilersFactory: {
        buildOutputValidator () {
          calls++
          return () => () => true
        }
      }
    }
  })
  t.after(() => fastify.close())

  fastify.get('/', async () => ({ hello: 'world' }))

  await fastify.ready()
  t.assert.strictEqual(calls, 0)
})

test('a route with a response schema builds the output pool once', async t => {
  let calls = 0
  const fastify = Fastify({
    schemaController: {
      compilersFactory: {
        buildOutputValidator () {
          calls++
          return () => () => true
        }
      }
    }
  })
  t.after(() => fastify.close())

  const schema = {
    response: {
      200: { type: 'object', properties: { hello: { type: 'string' } } }
    }
  }
  fastify.get('/a', { schema }, async () => ({ hello: 'world' }))
  fastify.get('/b', { schema }, async () => ({ hello: 'world' }))

  await fastify.ready()
  t.assert.strictEqual(calls, 1)
  t.assert.strictEqual(fastify[kSchemaController].isCustomOutputValidatorCompiler, true)
})

test('a child context inherits the output pool of its parent', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  const controller = fastify[kSchemaController]
  controller.setupOutputValidator(fastify[kOptions])
  const parentCompiler = controller.getOutputValidatorCompiler()
  t.assert.strictEqual(typeof parentCompiler, 'function')
  t.assert.strictEqual(controller.isCustomOutputValidatorCompiler, false)

  fastify.register(async function (child) {
    t.assert.strictEqual(child.outputValidatorCompiler, parentCompiler)
  })

  await fastify.ready()
})

test('the output validator options given to setSchemaController reach the output pool', async (t) => {
  const calls = []
  const fastify = Fastify({
    schemaController: {
      compilersFactory: {
        buildOutputValidator (externalSchemas, outputValidatorOptions) {
          calls.push({ externalSchemas, outputValidatorOptions })
          return () => () => true
        }
      }
    }
  })
  t.after(() => fastify.close())

  fastify.setSchemaController({
    outputValidatorOptions: { customOptions: { allErrors: true } }
  })

  fastify.get('/', {
    schema: {
      response: {
        200: { type: 'object', properties: { hello: { type: 'string' } } }
      }
    }
  }, async () => ({ hello: 'world' }))

  await fastify.ready()
  t.assert.strictEqual(calls.length, 1)
  t.assert.deepStrictEqual(calls[0].outputValidatorOptions, { customOptions: { allErrors: true } })
})

test('the default output factory merges the user customOptions over the framework defaults', async t => {
  const fastify = Fastify({
    schemaController: {
      outputValidatorOptions: {
        customOptions: { coerceTypes: false }
      }
    }
  })
  t.after(() => fastify.close())

  const controller = fastify[kSchemaController]
  controller.setupOutputValidator(fastify[kOptions])

  const validate = controller.outputValidatorCompiler({
    schema: { type: 'object', properties: { n: { type: 'number' } }, additionalProperties: false },
    url: '/',
    method: 'GET',
    httpStatus: '200'
  })
  // the user value wins
  t.assert.strictEqual(validate({ n: '42' }), false)
  // the framework default `removeAdditional: true` is kept
  const data = { n: 42, extra: true }
  t.assert.strictEqual(validate(data), true)
  t.assert.deepStrictEqual(data, { n: 42 })
})

function buildDefaultOutputValidator (t, schema) {
  const fastify = Fastify()
  t.after(() => fastify.close())

  const controller = fastify[kSchemaController]
  controller.setupOutputValidator(fastify[kOptions])

  return controller.outputValidatorCompiler({ schema, url: '/', method: 'GET', httpStatus: '200' })
}

test('the default output pool fills in the schema defaults', async t => {
  const validate = buildDefaultOutputValidator(t, {
    type: 'object',
    required: ['a'],
    properties: {
      a: { type: 'string', default: 'x' },
      o: { type: 'object', properties: { b: { type: 'integer', default: 7 } } }
    }
  })

  const data = { o: {} }
  t.assert.strictEqual(validate(data), true)
  t.assert.deepStrictEqual(data, { a: 'x', o: { b: 7 } })
})

test('the default output pool coerces the response values', async t => {
  const validate = buildDefaultOutputValidator(t, {
    type: 'object',
    properties: {
      n: { type: 'number' },
      s: { type: 'string' },
      e: { type: 'string' }
    }
  })

  const data = { n: '42', s: 42, e: null }
  t.assert.strictEqual(validate(data), true)
  t.assert.deepStrictEqual(data, { n: 42, s: '42', e: '' })
})

test('the default output pool does not validate the formats', async t => {
  const validate = buildDefaultOutputValidator(t, {
    type: 'object',
    properties: { email: { type: 'string', format: 'email' } }
  })

  t.assert.strictEqual(validate({ email: 'not an email' }), true)
})

test('the default output pool reports the first error only', async t => {
  const validate = buildDefaultOutputValidator(t, {
    type: 'object',
    properties: { a: { type: 'integer' }, b: { type: 'integer' } }
  })

  t.assert.strictEqual(validate({ a: 'x', b: 'y' }), false)
  t.assert.strictEqual(validate.errors.length, 1)
})
