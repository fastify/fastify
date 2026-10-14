const { sep } = require('node:path')
const { test } = require('node:test')
const Fastify = require('../../fastify')
const { kSchemaController } = require('../../lib/symbols')

test('SchemaController are NOT loaded when the controllers are custom', async t => {
  const app = Fastify({
    schemaController: {
      compilersFactory: {
        buildValidator: () => () => { },
        buildSerializer: () => () => { }
      }
    }
  })

  await app.ready()

  const loaded = Object.keys(require.cache)
  const ajvModule = loaded.find((path) => path.includes(`@fastify${sep}ajv-compiler`))
  const stringifyModule = loaded.find((path) => path.includes(`@fastify${sep}fast-json-stringify-compiler`))

  t.assert.equal(ajvModule, undefined, 'Ajv compiler is loaded')
  t.assert.equal(stringifyModule, undefined, 'Stringify compiler is loaded')
})

test('isCustomSerializerCompiler flag is set correctly when only buildSerializer is provided', async t => {
  const app = Fastify({
    schemaController: {
      compilersFactory: {
        buildSerializer: () => () => { }
      }
    }
  })

  await app.ready()

  const schemaController = app[kSchemaController]
  t.assert.equal(schemaController.isCustomValidatorCompiler, false, 'isCustomValidatorCompiler should be false')
  t.assert.equal(schemaController.isCustomSerializerCompiler, true, 'isCustomSerializerCompiler should be true')
})

test('isCustomValidatorCompiler flag is set correctly when only buildValidator is provided', async t => {
  const app = Fastify({
    schemaController: {
      compilersFactory: {
        buildValidator: () => () => { }
      }
    }
  })

  await app.ready()

  const schemaController = app[kSchemaController]
  t.assert.equal(schemaController.isCustomValidatorCompiler, true, 'isCustomValidatorCompiler should be true')
  t.assert.equal(schemaController.isCustomSerializerCompiler, false, 'isCustomSerializerCompiler should be false')
})

test('SchemaController are loaded when the controllers are not custom', async t => {
  const app = Fastify()
  await app.ready()

  const loaded = Object.keys(require.cache)
  const ajvModule = loaded.find((path) => path.includes(`@fastify${sep}ajv-compiler`))
  const stringifyModule = loaded.find((path) => path.includes(`@fastify${sep}fast-json-stringify-compiler`))

  t.after(() => {
    delete require.cache[ajvModule]
    delete require.cache[stringifyModule]
  })

  t.assert.ok(ajvModule, 'Ajv compiler is loaded')
  t.assert.ok(stringifyModule, 'Stringify compiler is loaded')
})

test('Reuses compiled serializers when routes share the same response schema object', async t => {
  const { kSchemaResponse, kRouteContext } = require('../../lib/symbols')
  const app = Fastify()

  const sharedSchema = {
    type: 'object',
    properties: {
      status: { type: 'string' },
      code: { type: 'integer' }
    }
  }

  let ctxA, ctxB, ctxC

  app.get('/a', { schema: { response: { 200: sharedSchema, '4xx': sharedSchema } } }, function (req, reply) {
    ctxA = reply[kRouteContext]
    return { status: 'ok', code: 200 }
  })

  app.get('/b', { schema: { response: { 200: sharedSchema } } }, function (req, reply) {
    ctxB = reply[kRouteContext]
    return { status: 'ok', code: 200 }
  })

  const distinctSchema = {
    type: 'object',
    properties: {
      status: { type: 'string' },
      code: { type: 'integer' }
    }
  }

  app.get('/c', { schema: { response: { 200: distinctSchema } } }, function (req, reply) {
    ctxC = reply[kRouteContext]
    return { status: 'ok', code: 200 }
  })

  await app.ready()

  const resA = await app.inject({ method: 'GET', url: '/a' })
  const resB = await app.inject({ method: 'GET', url: '/b' })
  const resC = await app.inject({ method: 'GET', url: '/c' })

  t.assert.equal(resA.statusCode, 200)
  t.assert.equal(resA.payload, '{"status":"ok","code":200}')
  t.assert.equal(resB.statusCode, 200)
  t.assert.equal(resB.payload, '{"status":"ok","code":200}')
  t.assert.equal(resC.statusCode, 200)
  t.assert.equal(resC.payload, '{"status":"ok","code":200}')

  const fnA200 = ctxA[kSchemaResponse]['200']
  const fnA4xx = ctxA[kSchemaResponse]['4xx']
  const fnB200 = ctxB[kSchemaResponse]['200']
  const fnC200 = ctxC[kSchemaResponse]['200']

  t.assert.equal(typeof fnA200, 'function')
  t.assert.equal(fnA200, fnA4xx, 'same status codes in the same route share serializer function')
  t.assert.equal(fnA200, fnB200, 'different routes sharing schema object share serializer function')
  t.assert.notEqual(fnA200, fnC200, 'distinct schema objects do not share serializer function')
})

test('Reuses compiled serializers across plugins and measures compiler invocation counts', async t => {
  const { kSchemaResponse, kRouteContext } = require('../../lib/symbols')
  const fjsPath = require.resolve('fast-json-stringify')
  const selPath = require.resolve('@fastify/fast-json-stringify-compiler')
  const standPath = require.resolve('@fastify/fast-json-stringify-compiler/standalone.js')

  delete require.cache[selPath]
  delete require.cache[standPath]

  const origFJS = require(fjsPath)
  let fjsCompiles = 0
  require.cache[fjsPath].exports = function (...args) {
    fjsCompiles++
    return origFJS(...args)
  }

  t.after(() => {
    require.cache[fjsPath].exports = origFJS
    delete require.cache[selPath]
    delete require.cache[standPath]
  })

  const app = Fastify()
  const sharedSchema = {
    type: 'object',
    properties: {
      message: { type: 'string' }
    }
  }

  let fnRoot, fnPlugin1, fnPlugin2, fnPlugin3

  app.get('/root', { schema: { response: { 200: sharedSchema, '4xx': sharedSchema } } }, function (req, reply) {
    fnRoot = reply[kRouteContext][kSchemaResponse]['200']
    return { message: 'root' }
  })

  app.register(async function (p1) {
    p1.get('/p1', { schema: { response: { 200: sharedSchema } } }, function (req, reply) {
      fnPlugin1 = reply[kRouteContext][kSchemaResponse]['200']
      return { message: 'p1' }
    })
  })

  app.register(async function (p2) {
    p2.get('/p2', { schema: { response: { 200: sharedSchema } } }, function (req, reply) {
      fnPlugin2 = reply[kRouteContext][kSchemaResponse]['200']
      return { message: 'p2' }
    })
  })

  // Plugin with isolated external schema
  app.register(async function (p3) {
    p3.addSchema({ $id: 'urn:ext-schema', type: 'object', properties: { id: { type: 'string' } } })
    p3.get('/p3', { schema: { response: { 200: sharedSchema } } }, function (req, reply) {
      fnPlugin3 = reply[kRouteContext][kSchemaResponse]['200']
      return { message: 'p3' }
    })
  })

  // Distinct schema object
  const distinctSchema = {
    type: 'object',
    properties: {
      message: { type: 'string' }
    }
  }
  app.get('/distinct', { schema: { response: { 200: distinctSchema } } }, () => ({ message: 'distinct' }))

  await app.ready()

  const resRoot = await app.inject({ method: 'GET', url: '/root' })
  const resP1 = await app.inject({ method: 'GET', url: '/p1' })
  const resP2 = await app.inject({ method: 'GET', url: '/p2' })
  const resP3 = await app.inject({ method: 'GET', url: '/p3' })
  const resDistinct = await app.inject({ method: 'GET', url: '/distinct' })

  t.assert.equal(resRoot.statusCode, 200)
  t.assert.equal(resRoot.payload, '{"message":"root"}')
  t.assert.equal(resP1.statusCode, 200)
  t.assert.equal(resP1.payload, '{"message":"p1"}')
  t.assert.equal(resP2.statusCode, 200)
  t.assert.equal(resP2.payload, '{"message":"p2"}')
  t.assert.equal(resP3.statusCode, 200)
  t.assert.equal(resP3.payload, '{"message":"p3"}')
  t.assert.equal(resDistinct.statusCode, 200)
  t.assert.equal(resDistinct.payload, '{"message":"distinct"}')

  // Shared schema across root, p1, and p2 must share the identical function
  t.assert.equal(fnRoot, fnPlugin1, 'root and plugin 1 share the same serializer function')
  t.assert.equal(fnPlugin1, fnPlugin2, 'plugin 1 and plugin 2 share the same serializer function')

  // Plugin 3 has different externalSchemas, so its pool is isolated
  t.assert.notEqual(fnRoot, fnPlugin3, 'plugin with different external schemas does not share serializer function')

  // Across root (GET 200, 4xx + auto HEAD), p1 (GET 200 + auto HEAD), and p2 (GET 200 + auto HEAD),
  // there were 8 potential compile points, but fastJsonStringify was only compiled ONCE for that pool.
  // Plus 1 compile for p3 (different external schemas) and 1 compile for /distinct.
  t.assert.equal(fjsCompiles, 3, 'fastJsonStringify is invoked only once per unique schema and pool key')
})

test('Cache isolation when serializerOpts differ', t => {
  const { kSchemaController } = require('../../lib/symbols')
  const app = Fastify()
  const builder = app[kSchemaController].getSerializerBuilder()

  const sharedSchema = {
    type: 'object',
    properties: {
      val: { type: 'number' }
    }
  }

  const compiler1 = builder({}, { rounding: 'floor' })
  const compiler2 = builder({}, { rounding: 'ceil' })

  const fn1 = compiler1({ schema: sharedSchema })
  const fn2 = compiler2({ schema: sharedSchema })

  t.assert.equal(typeof fn1, 'function')
  t.assert.equal(typeof fn2, 'function')
  t.assert.notEqual(fn1, fn2, 'compilers with different serializerOpts do not share serializer functions')
})
