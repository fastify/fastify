'use strict'

const { test } = require('node:test')
const Fastify = require('..')

const responseSchema = {
  200: { type: 'object', properties: { hello: { type: 'string' } } }
}

const noop = () => ({})

function spyFactory () {
  const calls = []
  function buildOutputValidator (externalSchemas, outputValidatorOptions) {
    calls.push({ externalSchemas, outputValidatorOptions })
    return function outputValidatorCompiler () {
      return () => true
    }
  }
  return { calls, buildOutputValidator }
}

async function buildDefaultCompiler (t, serverOptions, setup) {
  const fastify = Fastify(serverOptions)
  t.after(() => fastify.close())
  if (setup) setup(fastify)
  fastify.get('/', { schema: { response: responseSchema } }, noop)
  await fastify.ready()
  return fastify.outputValidatorCompiler
}

function compileWith (compiler, schema) {
  return compiler({ schema, method: 'GET', url: '/', httpStatus: '200' })
}

test('outputValidatorCompiler is undefined before the output pool is built', async t => {
  t.plan(2)
  const { calls, buildOutputValidator } = spyFactory()
  const fastify = Fastify({ schemaController: { compilersFactory: { buildOutputValidator } } })
  t.after(() => fastify.close())

  t.assert.strictEqual(fastify.outputValidatorCompiler, undefined)
  await fastify.ready()
  t.assert.strictEqual(calls.length, 0)
})

test('outputValidatorCompiler stays undefined when no route declares a response schema', async t => {
  t.plan(2)
  const { calls, buildOutputValidator } = spyFactory()
  const fastify = Fastify({ schemaController: { compilersFactory: { buildOutputValidator } } })
  t.after(() => fastify.close())

  fastify.get('/', noop)
  fastify.post('/', {
    schema: { body: { type: 'object', properties: { hello: { type: 'string' } } } }
  }, noop)

  await fastify.ready()
  t.assert.strictEqual(fastify.outputValidatorCompiler, undefined)
  t.assert.strictEqual(calls.length, 0)
})

test('outputValidatorCompiler is the compiler built by compilersFactory.buildOutputValidator', async t => {
  t.plan(1)
  const compiler = () => () => true
  const fastify = Fastify({
    schemaController: { compilersFactory: { buildOutputValidator: () => compiler } }
  })
  t.after(() => fastify.close())

  fastify.get('/', { schema: { response: responseSchema } }, noop)

  await fastify.ready()
  t.assert.strictEqual(fastify.outputValidatorCompiler, compiler)
})

test('onReady hook has the output validator compiler ready', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/', { schema: { response: responseSchema } }, noop)

  fastify.addHook('onReady', function (done) {
    t.assert.strictEqual(typeof this.outputValidatorCompiler, 'function')
    done()
  })

  fastify.register(async (instance) => {
    instance.addHook('onReady', function (done) {
      t.assert.strictEqual(typeof this.outputValidatorCompiler, 'function')
      done()
    })
  })

  await fastify.ready()
})

test('buildOutputValidator receives the shared schemas and the outputValidatorOptions', async t => {
  t.plan(3)
  const { calls, buildOutputValidator } = spyFactory()
  const outputValidatorOptions = { customOptions: { allErrors: true } }
  const fastify = Fastify({
    schemaController: { outputValidatorOptions, compilersFactory: { buildOutputValidator } }
  })
  t.after(() => fastify.close())

  const shared = { $id: 'shared', type: 'object', properties: { hello: { type: 'string' } } }
  fastify.addSchema(shared)
  fastify.get('/', { schema: { response: responseSchema } }, noop)

  await fastify.ready()
  t.assert.ok(calls.length > 0)
  t.assert.deepStrictEqual(calls[0].externalSchemas, { shared })
  t.assert.deepStrictEqual(calls[0].outputValidatorOptions, outputValidatorOptions)
})

test('Encapsulation: the schemas of a context reach its output pool only', async t => {
  t.plan(6)
  const { calls, buildOutputValidator } = spyFactory()
  const fastify = Fastify({ schemaController: { compilersFactory: { buildOutputValidator } } })
  t.after(() => fastify.close())

  fastify.addSchema({ $id: 'root', type: 'string' })
  fastify.get('/', { schema: { response: responseSchema } }, noop)

  let childCompiler
  let grandChildCompiler
  fastify.register(async (child) => {
    child.addSchema({ $id: 'child', type: 'string' })
    child.get('/child', { schema: { response: responseSchema } }, noop)
    child.addHook('onReady', function (done) {
      childCompiler = this.outputValidatorCompiler
      done()
    })

    child.register(async (grandChild) => {
      grandChild.addHook('onReady', function (done) {
        grandChildCompiler = this.outputValidatorCompiler
        done()
      })
    })
  })

  fastify.register(async (sibling) => {
    sibling.get('/sibling', { schema: { response: responseSchema } }, noop)
  })

  await fastify.ready()

  const pools = calls.map(call => Object.keys(call.externalSchemas).sort().join(','))
  t.assert.ok(pools.includes('root'), 'the root pool owns the root schemas')
  t.assert.ok(pools.includes('child,root'), 'the child pool owns the root and the child schemas')
  t.assert.ok(pools.every(pool => pool === 'root' || pool === 'child,root'), 'the child schemas never leak')

  t.assert.notStrictEqual(childCompiler, fastify.outputValidatorCompiler)
  t.assert.strictEqual(grandChildCompiler, childCompiler, 'a context without routes inherits the parent compiler')
  t.assert.strictEqual(typeof fastify.outputValidatorCompiler, 'function')
})

test('Encapsulation: a context without routes inherits the parent output validator compiler', async t => {
  t.plan(1)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/', { schema: { response: responseSchema } }, noop)

  let childCompiler
  fastify.register(async (child) => {
    child.addHook('onReady', function (done) {
      childCompiler = this.outputValidatorCompiler
      done()
    })
  })

  await fastify.ready()
  t.assert.strictEqual(childCompiler, fastify.outputValidatorCompiler)
})

test('setSchemaController: the outputValidatorOptions of a context reach its output pool only', async t => {
  t.plan(3)
  const { calls, buildOutputValidator } = spyFactory()
  const rootOptions = { customOptions: { allErrors: false } }
  const childOptions = { customOptions: { allErrors: true } }
  const fastify = Fastify({
    schemaController: { outputValidatorOptions: rootOptions, compilersFactory: { buildOutputValidator } }
  })
  t.after(() => fastify.close())

  fastify.get('/', { schema: { response: responseSchema } }, noop)

  fastify.register(async (child) => {
    child.setSchemaController({ outputValidatorOptions: childOptions })
    child.get('/child', { schema: { response: responseSchema } }, noop)
  })

  await fastify.ready()

  const options = calls.map(call => call.outputValidatorOptions)
  t.assert.ok(options.includes(rootOptions))
  t.assert.ok(options.includes(childOptions), 'the child inherits buildOutputValidator from the parent')
  t.assert.ok(options.every(o => o === rootOptions || o === childOptions))
})

test('setSchemaController: a context can replace buildOutputValidator', async t => {
  t.plan(4)
  const root = spyFactory()
  const child = spyFactory()
  const fastify = Fastify({
    schemaController: { compilersFactory: { buildOutputValidator: root.buildOutputValidator } }
  })
  t.after(() => fastify.close())

  fastify.addSchema({ $id: 'shared', type: 'string' })
  fastify.get('/', { schema: { response: responseSchema } }, noop)

  fastify.register(async (instance) => {
    instance.setSchemaController({
      compilersFactory: { buildOutputValidator: child.buildOutputValidator }
    })
    instance.get('/child', { schema: { response: responseSchema } }, noop)
  })

  await fastify.ready()

  t.assert.ok(root.calls.length > 0)
  t.assert.ok(child.calls.length > 0)
  t.assert.ok(child.calls.every(call => 'shared' in call.externalSchemas), 'the child pool owns the parent schemas')
  t.assert.ok(root.calls.every(call => Object.keys(call.externalSchemas).join() === 'shared'))
})

test('the default output pool fills in the schema defaults', async t => {
  t.plan(2)
  const compiler = await buildDefaultCompiler(t)
  const validate = compileWith(compiler, {
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
  t.plan(2)
  const compiler = await buildDefaultCompiler(t)
  const validate = compileWith(compiler, {
    type: 'object',
    properties: { n: { type: 'number' }, s: { type: 'string' }, e: { type: 'string' } }
  })

  const data = { n: '42', s: 42, e: null }
  t.assert.strictEqual(validate(data), true)
  t.assert.deepStrictEqual(data, { n: 42, s: '42', e: '' })
})

test('the default output pool strips the properties that the schema forbids', async t => {
  t.plan(2)
  const compiler = await buildDefaultCompiler(t)
  const validate = compileWith(compiler, {
    type: 'object',
    properties: { a: { type: 'string' } },
    additionalProperties: false
  })

  const data = { a: 'x', z: 1 }
  t.assert.strictEqual(validate(data), true)
  t.assert.deepStrictEqual(data, { a: 'x' })
})

test('the default output pool does not validate the formats', async t => {
  t.plan(1)
  const compiler = await buildDefaultCompiler(t)
  const validate = compileWith(compiler, {
    type: 'object',
    properties: { email: { type: 'string', format: 'email' } }
  })

  t.assert.strictEqual(validate({ email: 'not an email' }), true)
})

test('the default output pool reports the first error only', async t => {
  t.plan(2)
  const compiler = await buildDefaultCompiler(t)
  const validate = compileWith(compiler, {
    type: 'object',
    properties: { a: { type: 'integer' }, b: { type: 'integer' } }
  })

  t.assert.strictEqual(validate({ a: 'x', b: 'y' }), false)
  t.assert.strictEqual(validate.errors.length, 1)
})

test('the default output pool does not lint the response schemas', async t => {
  t.plan(1)
  const compiler = await buildDefaultCompiler(t)

  t.assert.doesNotThrow(() => compileWith(compiler, { type: 'object', whatever: 'unknown keyword' }))
})

test('the outputValidatorOptions customOptions win over the defaults', async t => {
  t.plan(3)
  const compiler = await buildDefaultCompiler(t, {
    schemaController: {
      outputValidatorOptions: { customOptions: { coerceTypes: false, strict: true } }
    }
  })

  t.assert.throws(() => compileWith(compiler, { type: 'object', whatever: 'unknown keyword' }))

  const validate = compileWith(compiler, {
    type: 'object',
    properties: { n: { type: 'number' } },
    additionalProperties: false
  })
  t.assert.strictEqual(validate({ n: '42' }), false)

  const data = { n: 42, extra: true }
  validate(data)
  t.assert.deepStrictEqual(data, { n: 42 }, 'the other defaults are kept')
})

test('the outputValidatorOptions plugins and onCreate reach the default output pool', async t => {
  t.plan(3)
  let created = 0
  const compiler = await buildDefaultCompiler(t, {
    schemaController: {
      outputValidatorOptions: {
        onCreate (ajv) { created++ },
        plugins: [(ajv) => ajv.addKeyword({ keyword: 'even', validate: (_, data) => data % 2 === 0 })]
      }
    }
  })

  const validate = compileWith(compiler, { type: 'integer', even: true })
  t.assert.ok(created > 0)
  t.assert.strictEqual(validate(2), true)
  t.assert.strictEqual(validate(3), false)
})

test('the default output pool resolves the shared schemas', async t => {
  t.plan(2)
  const compiler = await buildDefaultCompiler(t, undefined, (fastify) => {
    fastify.addSchema({ $id: 'shared', type: 'object', properties: { n: { type: 'number' } } })
  })

  const validate = compileWith(compiler, { $ref: 'shared#' })
  const data = { n: '1' }
  t.assert.strictEqual(validate(data), true)
  t.assert.deepStrictEqual(data, { n: 1 })
})

test('Encapsulation: the default output pool of a context does not resolve the schemas of its children', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/', { schema: { response: responseSchema } }, noop)

  let childCompiler
  fastify.register(async (child) => {
    child.addSchema({ $id: 'child', type: 'string' })
    child.get('/child', { schema: { response: responseSchema } }, noop)
    child.addHook('onReady', function (done) {
      childCompiler = this.outputValidatorCompiler
      done()
    })
  })

  await fastify.ready()

  t.assert.doesNotThrow(() => compileWith(childCompiler, { $ref: 'child#' }))
  t.assert.throws(() => compileWith(fastify.outputValidatorCompiler, { $ref: 'child#' }))
})
