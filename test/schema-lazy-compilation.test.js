'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const { spyWarning } = require('process-warning')
const { FSTWRN001 } = require('../lib/warnings')
const { AjvCompiler } = require('@fastify/ajv-compiler')
const { SerializerSelector } = require('@fastify/fast-json-stringify-compiler')

const schema = {
  params: { type: 'object', properties: { id: { type: 'integer' } } },
  body: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
  querystring: { type: 'object', properties: { verbose: { type: 'boolean' } } },
  headers: { type: 'object', properties: { 'x-trace': { type: 'string' } } },
  response: {
    200: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } }
  }
}

function build (options, compilerSpies) {
  const calls = { validator: 0, serializer: 0 }
  if (compilerSpies) {
    options = {
      ...options,
      schemaController: {
        compilersFactory: {
          buildValidator (externalSchemas, ajvOptions) {
            const compile = AjvCompiler()(externalSchemas, ajvOptions)
            return function (opts) { calls.validator++; return compile(opts) }
          },
          buildSerializer (externalSchemas, serializerOptions) {
            const compile = SerializerSelector()(externalSchemas, serializerOptions)
            return function (opts) { calls.serializer++; return compile(opts) }
          }
        }
      }
    }
  }
  const fastify = Fastify(options)
  fastify.post('/items/:id', { schema }, async (request) => ({
    id: request.params.id,
    name: request.body.name,
    leaked: true
  }))
  fastify.get('/plain', async () => ({ plain: true }))
  return { fastify, calls }
}

test('lazySchemaCompilation defaults to false and is exposed in initialConfig', t => {
  t.plan(2)
  t.assert.strictEqual(Fastify().initialConfig.lazySchemaCompilation, false)
  t.assert.strictEqual(Fastify({ lazySchemaCompilation: true }).initialConfig.lazySchemaCompilation, true)
})

test('default mode compiles validators and serializers at route registration', async t => {
  t.plan(2)
  const { fastify, calls } = build({}, true)
  await fastify.ready()
  t.assert.strictEqual(calls.validator, 4)
  t.assert.strictEqual(calls.serializer, 1)
})

test('lazy mode compiles nothing before the first request, then once per route', async t => {
  t.plan(8)
  const { fastify, calls } = build({ lazySchemaCompilation: true }, true)
  await fastify.ready()
  t.assert.strictEqual(calls.validator, 0)
  t.assert.strictEqual(calls.serializer, 0)

  const res = await fastify.inject({ method: 'POST', url: '/items/1', payload: { name: 'a' } })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(calls.validator, 4)
  t.assert.strictEqual(calls.serializer, 1)

  await fastify.inject({ method: 'POST', url: '/items/2', payload: { name: 'b' } })
  await fastify.inject('/plain')
  t.assert.strictEqual(calls.validator, 4)
  t.assert.strictEqual(calls.serializer, 1)
  t.assert.strictEqual(res.json().leaked, undefined)
})

test('lazy mode produces the same responses as the default mode', async t => {
  const requests = [
    { method: 'POST', url: '/items/1', payload: { name: 'a' } },
    { method: 'POST', url: '/items/1', payload: {} },
    { method: 'POST', url: '/items/abc', payload: { name: 'a' } },
    { method: 'POST', url: '/items/1?verbose=maybe', payload: { name: 'a' } },
    { method: 'POST', url: '/items/1', payload: 'not json', headers: { 'content-type': 'application/json' } },
    { method: 'GET', url: '/plain' }
  ]
  t.plan(requests.length * 2)
  const eager = build({}).fastify
  const lazy = build({ lazySchemaCompilation: true }).fastify
  await eager.ready()
  await lazy.ready()
  for (const request of requests) {
    const a = await eager.inject(request)
    const b = await lazy.inject(request)
    t.assert.strictEqual(b.statusCode, a.statusCode, `${request.method} ${request.url}`)
    t.assert.deepStrictEqual(b.json(), a.json(), `${request.method} ${request.url}`)
  }
})

test('lazy mode applies to route level compilers too', async t => {
  t.plan(4)
  const fastify = Fastify({ lazySchemaCompilation: true })
  let validator = 0
  let serializer = 0
  fastify.get('/custom', {
    schema: { querystring: { type: 'object' }, response: { 200: { type: 'object' } } },
    validatorCompiler: () => { validator++; return () => true },
    serializerCompiler: () => { serializer++; return (data) => JSON.stringify({ wrapped: data }) }
  }, async () => ({ ok: true }))
  await fastify.ready()
  t.assert.strictEqual(validator + serializer, 0)
  const res = await fastify.inject('/custom')
  t.assert.strictEqual(validator, 1)
  t.assert.strictEqual(serializer, 1)
  t.assert.deepStrictEqual(res.json(), { wrapped: { ok: true } })
})

test('lazy mode: request.getValidationFunction and reply.getSerializationFunction compile on demand', async t => {
  t.plan(3)
  const fastify = Fastify({ lazySchemaCompilation: true })
  fastify.post('/fns', { schema }, async (request, reply) => {
    const validate = request.getValidationFunction('body')
    const serialize = reply.getSerializationFunction(200)
    return { id: 1, name: String(typeof validate === 'function' && typeof serialize === 'function') }
  })
  await fastify.ready()
  const res = await fastify.inject({ method: 'POST', url: '/fns', payload: { name: 'x' } })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.json().name, 'true')
  t.assert.strictEqual(res.json().leaked, undefined)
})

test('lazy mode: a validation schema that cannot be compiled fails at the first request, not at ready', async t => {
  t.plan(5)
  const broken = { body: { type: 'object', properties: { a: { type: 'not-a-type' } } } }

  const eager = Fastify()
  eager.post('/broken', { schema: broken }, async () => ({}))
  await t.assert.rejects(eager.ready(), { code: 'FST_ERR_SCH_VALIDATION_BUILD' })

  const lazy = Fastify({ lazySchemaCompilation: true })
  lazy.post('/broken', { schema: broken }, async () => ({}))
  await lazy.ready()
  const res = await lazy.inject({ method: 'POST', url: '/broken', payload: {} })
  t.assert.strictEqual(res.statusCode, 500)
  t.assert.strictEqual(res.json().code, 'FST_ERR_SCH_VALIDATION_BUILD')
  // the failure is not cached as a compiled function: the route keeps failing the same way
  const again = await lazy.inject({ method: 'POST', url: '/broken', payload: {} })
  t.assert.strictEqual(again.statusCode, 500)
  t.assert.strictEqual(again.json().code, 'FST_ERR_SCH_VALIDATION_BUILD')
})

test('lazy mode: a response schema that cannot be compiled fails at the first reply, not at ready', async t => {
  t.plan(5)
  const broken = { response: { 200: { type: 'object', properties: { a: { type: 'not-a-type' } } } } }

  const eager = Fastify()
  eager.get('/broken', { schema: broken }, async () => ({}))
  await t.assert.rejects(eager.ready(), { code: 'FST_ERR_SCH_SERIALIZATION_BUILD' })

  const lazy = Fastify({ lazySchemaCompilation: true })
  lazy.get('/broken', { schema: broken }, async () => ({}))
  await lazy.ready()
  const res = await lazy.inject('/broken')
  t.assert.strictEqual(res.statusCode, 500)
  t.assert.strictEqual(res.json().code, 'FST_ERR_SCH_SERIALIZATION_BUILD')
  const again = await lazy.inject('/broken')
  t.assert.strictEqual(again.statusCode, 500)
  t.assert.strictEqual(again.json().code, 'FST_ERR_SCH_SERIALIZATION_BUILD')
})

test('lazy mode: a build error always fails the request, even with attachValidation', async t => {
  t.plan(8)
  const brokenValidation = { body: { type: 'object', properties: { a: { type: 'not-a-type' } } } }
  const brokenSerialization = { response: { 200: { type: 'object', properties: { a: { type: 'not-a-type' } } } } }
  const fastify = Fastify({ lazySchemaCompilation: true })
  fastify.post('/validation', { schema: brokenValidation, attachValidation: true }, async () => ({ handler: 'ran' }))
  fastify.post('/serialization', { schema: brokenSerialization, attachValidation: true }, async () => ({ handler: 'ran' }))
  await fastify.ready()
  for (const [url, code] of [['/validation', 'FST_ERR_SCH_VALIDATION_BUILD'], ['/serialization', 'FST_ERR_SCH_SERIALIZATION_BUILD']]) {
    for (let i = 0; i < 2; i++) {
      const res = await fastify.inject({ method: 'POST', url, payload: {} })
      t.assert.strictEqual(res.statusCode, 500, `${url} request ${i}`)
      t.assert.strictEqual(res.json().code, code, `${url} request ${i}`)
    }
  }
})

test('lazy mode: attachValidation still attaches ordinary validation errors', async t => {
  t.plan(2)
  const fastify = Fastify({ lazySchemaCompilation: true })
  const { response, ...withoutResponse } = schema
  fastify.post('/attach', { schema: withoutResponse, attachValidation: true }, async (request) => ({ attached: request.validationError !== undefined }))
  await fastify.ready()
  const res = await fastify.inject({ method: 'POST', url: '/attach', payload: {} })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.json().attached, true)
})

test('lazy mode: the first build failure is terminal, a second broken schema does not replace it', async t => {
  t.plan(4)
  const broken = {
    body: { type: 'object', properties: { a: { type: 'not-a-type' } } },
    response: { 200: { type: 'object', properties: { a: { type: 'not-a-type' } } } }
  }
  const fastify = Fastify({ lazySchemaCompilation: true })
  fastify.post('/both', { schema: broken }, async () => ({}))
  await fastify.ready()
  for (let i = 0; i < 2; i++) {
    const res = await fastify.inject({ method: 'POST', url: '/both', payload: {} })
    t.assert.strictEqual(res.statusCode, 500)
    t.assert.strictEqual(res.json().code, 'FST_ERR_SCH_VALIDATION_BUILD')
  }
})

test('lazy mode: request.validateInput works on a route that has not been compiled yet', async t => {
  t.plan(4)
  const results = {}
  for (const lazySchemaCompilation of [false, true]) {
    const fastify = Fastify({ lazySchemaCompilation })
    fastify.post('/input', {
      schema,
      // runs before the validation step, so on a lazy route nothing is compiled yet
      preValidation: async (request) => {
        request.results = [
          request.validateInput({ name: 'x' }, 'body'),
          request.validateInput({}, 'body'),
          // an explicit schema does not replace the schema of the route part
          request.validateInput({}, { type: 'object' }, 'body')
        ].join(',')
      }
    }, async (request) => ({ id: 1, name: request.results }))
    await fastify.ready()
    const res = await fastify.inject({ method: 'POST', url: '/input', payload: { name: 'y' } })
    t.assert.strictEqual(res.statusCode, 200, `lazy=${lazySchemaCompilation}`)
    results[lazySchemaCompilation] = res.json().name
  }
  t.assert.strictEqual(results.true, results.false)
  t.assert.strictEqual(results.true, 'true,false,false')
})

test('lazy mode: FSTWRN001 for an undefined schema part is still emitted at registration', async t => {
  t.plan(3)
  const spyData = spyWarning(FSTWRN001)
  t.after(spyData.restore)
  const fastify = Fastify({ lazySchemaCompilation: true })
  fastify.post('/warn', { schema: { body: schema.body, headers: undefined } }, async () => ({}))
  await fastify.ready()
  t.assert.deepStrictEqual(spyData.calls, [{ arguments: ['headers', 'POST', '/warn'], result: true }])
  const res = await fastify.inject({ method: 'POST', url: '/warn', payload: { name: 'x' } })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(spyData.callCount(), 1)
})

test('lazy mode: a request failing before validation still reports the broken response schema consistently', async t => {
  t.plan(6)
  const broken = { response: { 200: { type: 'object', properties: { a: { type: 'not-a-type' } } } } }
  const fastify = Fastify({ lazySchemaCompilation: true })
  fastify.post('/broken', { schema: broken }, async () => ({}))
  await fastify.ready()
  // malformed JSON: the request fails before the validation step, the error reply
  // is the first thing that needs a serializer of this route
  const first = await fastify.inject({ method: 'POST', url: '/broken', payload: '{not json', headers: { 'content-type': 'application/json' } })
  t.assert.strictEqual(first.statusCode, 500)
  t.assert.strictEqual(first.json().code, 'FST_ERR_SCH_SERIALIZATION_BUILD')
  const second = await fastify.inject({ method: 'POST', url: '/broken', payload: {} })
  t.assert.strictEqual(second.statusCode, 500)
  t.assert.strictEqual(second.json().code, 'FST_ERR_SCH_SERIALIZATION_BUILD')
  t.assert.deepStrictEqual(first.json(), second.json())
  t.assert.strictEqual(first.json().error, 'Internal Server Error')
})

test('lazy mode: a cached build failure is reported by every later lookup, even on a request that never reaches validation', async t => {
  t.plan(8)
  const broken = { response: { 200: { type: 'object', properties: { a: { type: 'not-a-type' } } } } }
  const fastify = Fastify({ lazySchemaCompilation: true })
  fastify.post('/broken', { schema: broken }, async () => ({}))
  // the public lookup helpers, called before the validation step, must report the
  // build error on the request that triggers it and on every request after it
  fastify.post('/lookup', {
    schema: broken,
    onRequest: async (request, reply) => {
      t.assert.throws(() => reply.getSerializationFunction(200), { code: 'FST_ERR_SCH_SERIALIZATION_BUILD' })
    }
  }, async () => ({}))
  await fastify.ready()
  const malformed = { method: 'POST', url: '/broken', payload: '{not json', headers: { 'content-type': 'application/json' } }
  const first = await fastify.inject(malformed)
  t.assert.strictEqual(first.statusCode, 500)
  t.assert.strictEqual(first.json().code, 'FST_ERR_SCH_SERIALIZATION_BUILD')
  // the second malformed request also fails before validation: the serializer
  // lookup in the error reply must surface the cached build error, not the parse error
  const second = await fastify.inject(malformed)
  t.assert.strictEqual(second.statusCode, 500)
  t.assert.strictEqual(second.json().code, 'FST_ERR_SCH_SERIALIZATION_BUILD')
  t.assert.deepStrictEqual(first.json(), second.json())
  await fastify.inject({ method: 'POST', url: '/lookup', payload: {} })
  const lookup = await fastify.inject({ method: 'POST', url: '/lookup', payload: {} })
  t.assert.strictEqual(lookup.json().code, 'FST_ERR_SCH_SERIALIZATION_BUILD')
})

test('lazySchemaCompilation accepts the coercible values the config validator accepts', async t => {
  t.plan(4)
  for (const value of ['true', 1]) {
    const fastify = Fastify({ lazySchemaCompilation: value })
    const broken = { body: { type: 'object', properties: { a: { type: 'not-a-type' } } } }
    fastify.post('/broken', { schema: broken }, async () => ({}))
    t.assert.strictEqual(fastify.initialConfig.lazySchemaCompilation, true)
    // eager compilation would reject ready(): the coerced value must reach the route code
    await t.assert.doesNotReject(fastify.ready())
  }
})
