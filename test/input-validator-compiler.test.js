'use strict'

const { test } = require('node:test')
const Fastify = require('..')

const numberBody = {
  body: {
    type: 'object',
    properties: { n: { type: 'number' } }
  }
}

function echo (request) {
  return request.body
}

function inputValidationFailure (message) {
  return {
    statusCode: 400,
    code: 'FST_ERR_VALIDATION',
    error: 'Bad Request',
    message
  }
}

test('inputValidatorCompiler is undefined until a route declares a request schema', async t => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  t.assert.strictEqual(fastify.inputValidatorCompiler, undefined)

  fastify.get('/', {
    schema: { response: { 200: { type: 'object' } } }
  }, () => ({}))

  await fastify.ready()
  t.assert.strictEqual(fastify.inputValidatorCompiler, undefined, 'a response schema does not build the input pool')

  const app = Fastify()
  t.after(() => app.close())
  app.post('/', { schema: numberBody }, echo)
  await app.ready()
  t.assert.strictEqual(typeof app.inputValidatorCompiler, 'function')
})

test('inputValidatorCompiler is the compiler built by compilersFactory.buildInputValidator', async t => {
  t.plan(1)
  const compiler = () => () => true
  const fastify = Fastify({
    schemaController: { compilersFactory: { buildInputValidator: () => compiler } }
  })
  t.after(() => fastify.close())

  fastify.post('/', { schema: numberBody }, echo)

  await fastify.ready()
  t.assert.strictEqual(fastify.inputValidatorCompiler, compiler)
})

test('the old validatorCompiler names are gone', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  t.assert.strictEqual(fastify.validatorCompiler, undefined)
  t.assert.strictEqual(fastify.setValidatorCompiler, undefined)
})

test('the top-level ajv option is ignored', async t => {
  t.plan(1)
  const fastify = Fastify({ ajv: { customOptions: { coerceTypes: false } } })
  t.after(() => fastify.close())

  fastify.post('/', { schema: numberBody }, echo)

  const res = await fastify.inject({ method: 'POST', url: '/', body: { n: '42' } })
  t.assert.deepStrictEqual(res.json(), { n: 42 }, 'the default pool still coerces the body')
})

test('the inputValidatorOptions customOptions configure the default input pool', async t => {
  t.plan(2)
  const fastify = Fastify({
    schemaController: {
      inputValidatorOptions: { customOptions: { coerceTypes: false, allErrors: true } }
    }
  })
  t.after(() => fastify.close())

  fastify.post('/coerce', { schema: numberBody }, echo)
  fastify.post('/all-errors', {
    schema: {
      body: {
        type: 'object',
        properties: { a: { type: 'number', minimum: 10 }, b: { type: 'number', minimum: 10 } }
      }
    }
  }, echo)

  t.assert.deepStrictEqual(
    (await fastify.inject({ method: 'POST', url: '/coerce', body: { n: '42' } })).json(),
    inputValidationFailure('body/n must be number')
  )
  t.assert.deepStrictEqual(
    (await fastify.inject({ method: 'POST', url: '/all-errors', body: { a: 1, b: 1 } })).json(),
    inputValidationFailure('body/a must be >= 10, body/b must be >= 10')
  )
})

test('the inputValidatorOptions plugins and onCreate reach the default input pool', async t => {
  t.plan(3)
  let created = 0
  const fastify = Fastify({
    schemaController: {
      inputValidatorOptions: {
        onCreate () { created++ },
        plugins: [(ajv) => ajv.addKeyword({ keyword: 'even', validate: (_, data) => data % 2 === 0 })]
      }
    }
  })
  t.after(() => fastify.close())

  fastify.get('/:n', {
    schema: { params: { type: 'object', properties: { n: { type: 'integer', even: true } } } }
  }, (request) => ({ n: request.params.n }))

  t.assert.strictEqual((await fastify.inject('/2')).statusCode, 200)
  t.assert.strictEqual((await fastify.inject('/3')).json().code, 'FST_ERR_VALIDATION')
  t.assert.ok(created > 0)
})

test('compilersFactory.buildInputValidator receives the inputValidatorOptions with their defaults', async t => {
  t.plan(2)
  const received = []
  const fastify = Fastify({
    schemaController: {
      compilersFactory: {
        buildInputValidator (externalSchemas, inputValidatorOptions) {
          received.push(inputValidatorOptions)
          return () => () => true
        }
      }
    }
  })
  t.after(() => fastify.close())

  fastify.post('/', { schema: numberBody }, echo)
  fastify.register(async (child) => {
    child.setSchemaController({ inputValidatorOptions: { customOptions: { coerceTypes: false } } })
    child.post('/', { schema: numberBody }, echo)
  }, { prefix: '/child' })

  await fastify.ready()
  t.assert.deepStrictEqual(received[0], { customOptions: {}, plugins: [] })
  t.assert.deepStrictEqual(received[1], { customOptions: { coerceTypes: false }, plugins: [] })
})

test('setSchemaController: the inputValidatorOptions of a context apply to its routes only', async t => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.post('/', { schema: numberBody }, echo)

  fastify.register(async (child) => {
    child.setSchemaController({ inputValidatorOptions: { customOptions: { coerceTypes: false } } })
    child.post('/', { schema: numberBody }, echo)

    child.register(async (grandChild) => {
      grandChild.post('/nested', { schema: numberBody }, echo)
    })
  }, { prefix: '/strict' })

  const body = { n: '42' }
  t.assert.deepStrictEqual((await fastify.inject({ method: 'POST', url: '/', body })).json(), { n: 42 })
  t.assert.deepStrictEqual(
    (await fastify.inject({ method: 'POST', url: '/strict', body })).json(),
    inputValidationFailure('body/n must be number')
  )
  t.assert.deepStrictEqual(
    (await fastify.inject({ method: 'POST', url: '/strict/nested', body })).json(),
    inputValidationFailure('body/n must be number')
  )
})

test('Encapsulation: setInputValidatorCompiler applies to its context only', async t => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  const rejectAll = () => () => ({ error: new Error('rejected') })

  fastify.post('/', { schema: numberBody }, echo)

  fastify.register(async (child) => {
    child.setInputValidatorCompiler(rejectAll)
    t.assert.strictEqual(child.inputValidatorCompiler, rejectAll)
    child.post('/', { schema: numberBody }, echo)
  }, { prefix: '/child' })

  const body = { n: 1 }
  t.assert.strictEqual((await fastify.inject({ method: 'POST', url: '/', body })).statusCode, 200)
  t.assert.strictEqual((await fastify.inject({ method: 'POST', url: '/child', body })).statusCode, 400)
})

test('Encapsulation: setInputValidatorCompiler survives an addSchema in a child context', async t => {
  t.plan(1)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.setInputValidatorCompiler(() => () => ({ error: new Error('rejected') }))

  fastify.register(async (child) => {
    child.addSchema({ $id: 'unused', type: 'string' })
    child.post('/', { schema: numberBody }, echo)
  })

  t.assert.strictEqual((await fastify.inject({ method: 'POST', url: '/', body: { n: 1 } })).statusCode, 400)
})

test('the inputValidatorCompiler route option wins over the context compiler', async t => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  const rejectAll = () => () => ({ error: new Error('rejected') })

  fastify.post('/', { schema: numberBody }, echo)
  fastify.post('/route', { schema: numberBody, inputValidatorCompiler: rejectAll }, echo)

  const body = { n: 1 }
  t.assert.strictEqual((await fastify.inject({ method: 'POST', url: '/', body })).statusCode, 200)
  t.assert.strictEqual((await fastify.inject({ method: 'POST', url: '/route', body })).statusCode, 400)
  t.assert.notStrictEqual(fastify.inputValidatorCompiler, rejectAll, 'the route compiler does not change the instance one')
})
