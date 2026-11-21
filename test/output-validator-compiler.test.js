'use strict'

const { test } = require('node:test')
const Ajv = require('ajv')
const Fastify = require('..')

// `minimum` is ignored by fast-json-stringify: a response that violates it can
// only be rejected by the output validator.
const atLeastTen = {
  200: {
    type: 'object',
    properties: { n: { type: 'number', minimum: 10 } }
  }
}

function outputValidationFailure (message) {
  return {
    statusCode: 500,
    code: 'FST_ERR_SCH_OUTPUT_VALIDATION',
    error: 'Internal Server Error',
    message: `Response validation failed. Errors: ${message}`
  }
}

test('outputValidatorCompiler is undefined until a route declares a response schema', async t => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  t.assert.strictEqual(fastify.outputValidatorCompiler, undefined)

  fastify.post('/', {
    schema: { body: { type: 'object' } }
  }, () => ({}))

  fastify.register(async (instance) => {
    instance.get('/child', { schema: { response: atLeastTen } }, () => ({ n: 10 }))
  })

  await fastify.ready()
  t.assert.strictEqual(fastify.outputValidatorCompiler, undefined, 'the root context has no response schema')

  const app = Fastify()
  t.after(() => app.close())
  app.get('/', { schema: { response: atLeastTen } }, () => ({ n: 10 }))
  await app.ready()
  t.assert.strictEqual(typeof app.outputValidatorCompiler, 'function')
})

test('outputValidatorCompiler is the compiler built by compilersFactory.buildOutputValidator', async t => {
  t.plan(1)
  const compiler = () => () => true
  const fastify = Fastify({
    schemaController: { compilersFactory: { buildOutputValidator: () => compiler } }
  })
  t.after(() => fastify.close())

  fastify.get('/', { schema: { response: atLeastTen } }, () => ({ n: 1 }))

  await fastify.ready()
  t.assert.strictEqual(fastify.outputValidatorCompiler, compiler)
})

test('onReady hook has the output validator compiler ready', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/', { schema: { response: atLeastTen } }, () => ({ n: 10 }))

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

test('a response that violates the response schema fails with FST_ERR_SCH_OUTPUT_VALIDATION', async t => {
  t.plan(4)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/ok', { schema: { response: atLeastTen } }, () => ({ n: 10 }))
  fastify.get('/ko', { schema: { response: atLeastTen } }, () => ({ n: 1 }))

  const ok = await fastify.inject('/ok')
  t.assert.strictEqual(ok.statusCode, 200)
  t.assert.deepStrictEqual(ok.json(), { n: 10 })

  const ko = await fastify.inject('/ko')
  t.assert.strictEqual(ko.statusCode, 500)
  t.assert.deepStrictEqual(ko.json(), outputValidationFailure('/n must be >= 10'))
})

test('the output validation error reaches the error handler', async t => {
  t.plan(4)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.setErrorHandler((error, request, reply) => {
    t.assert.strictEqual(error.code, 'FST_ERR_SCH_OUTPUT_VALIDATION')
    t.assert.strictEqual(error.validationContext, 'response')
    t.assert.strictEqual(error.validation[0].keyword, 'minimum')
    reply.code(502).send({ handled: true })
  })

  fastify.get('/', { schema: { response: atLeastTen } }, () => ({ n: 1 }))

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 502)
})

test('the output validator is selected by status code, NXX wildcard and default entry', async t => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  const limit = (minimum) => ({ type: 'object', properties: { n: { type: 'number', minimum } } })

  // The `default` entry matches the 500 error response too: the error is
  // reported as plain text to keep it out of the response schemas.
  fastify.setErrorHandler((error, request, reply) => {
    reply.code(500).type('text/plain').send(error.code)
  })

  fastify.get('/:code', {
    schema: {
      response: {
        201: limit(1000),
        '2xx': limit(200),
        default: limit(500)
      }
    }
  }, (request, reply) => {
    reply.code(Number(request.params.code)).send({ n: 300 })
  })

  t.assert.strictEqual((await fastify.inject('/201')).payload, 'FST_ERR_SCH_OUTPUT_VALIDATION', 'exact status code')
  t.assert.strictEqual((await fastify.inject('/202')).statusCode, 202, 'NXX wildcard')
  t.assert.strictEqual((await fastify.inject('/404')).payload, 'FST_ERR_SCH_OUTPUT_VALIDATION', 'default entry')
})

test('the output validator is selected by content type', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/:type', {
    schema: {
      response: {
        200: {
          content: {
            'application/json': { schema: atLeastTen[200] },
            'application/vnd.v2+json': { schema: { type: 'object', properties: { n: { type: 'number' } } } }
          }
        }
      }
    }
  }, (request, reply) => {
    reply.type(request.params.type === 'v2' ? 'application/vnd.v2+json' : 'application/json').send({ n: 1 })
  })

  t.assert.strictEqual((await fastify.inject('/v1')).json().code, 'FST_ERR_SCH_OUTPUT_VALIDATION')
  t.assert.deepStrictEqual((await fastify.inject('/v2')).json(), { n: 1 })
})

test('the payloads that do not reach fast-json-stringify are not validated', async t => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/null', { schema: { response: atLeastTen } }, (request, reply) => { reply.send(null) })
  fastify.get('/string', { schema: { response: atLeastTen } }, (request, reply) => { reply.send('{"n":1}') })
  fastify.get('/custom', { schema: { response: atLeastTen } }, (request, reply) => {
    reply.serializer(JSON.stringify).send({ n: 1 })
  })

  t.assert.strictEqual((await fastify.inject('/null')).statusCode, 200)
  t.assert.strictEqual((await fastify.inject('/string')).payload, '{"n":1}')
  t.assert.strictEqual((await fastify.inject('/custom')).payload, '{"n":1}')
})

test('the default output pool shapes the handler payload before fast-json-stringify', async t => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  const payload = { n: '42', extra: true }
  fastify.get('/', {
    schema: {
      response: {
        200: {
          type: 'object',
          additionalProperties: false,
          properties: {
            n: { type: 'number' },
            a: { type: 'string', default: 'x' },
            o: { type: 'object', properties: { b: { type: 'integer', default: 7 } } }
          }
        }
      }
    }
  }, () => {
    payload.o = {}
    return payload
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.json(), { n: 42, a: 'x', o: { b: 7 } })
  t.assert.deepStrictEqual(payload, { n: 42, a: 'x', o: { b: 7 } }, 'the payload is shaped in place')
})

test('the default output pool does not validate the formats', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/', {
    schema: {
      response: { 200: { type: 'object', properties: { email: { type: 'string', format: 'email' } } } }
    }
  }, () => ({ email: 'not an email' }))

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.json(), { email: 'not an email' })
})

test('the default output pool reports the first error only', async t => {
  t.plan(1)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: { a: { type: 'number', minimum: 10 }, b: { type: 'number', minimum: 10 } }
        }
      }
    }
  }, () => ({ a: 1, b: 1 }))

  const res = await fastify.inject('/')
  t.assert.deepStrictEqual(res.json(), outputValidationFailure('/a must be >= 10'))
})

test('the default output pool does not lint the response schemas', async t => {
  t.plan(1)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/', {
    schema: { response: { 200: { type: 'object', whatever: 'unknown keyword' } } }
  }, () => ({ hello: 'world' }))

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 200)
})

test('the outputValidatorOptions customOptions win over the defaults', async t => {
  t.plan(3)
  const fastify = Fastify({
    schemaController: {
      outputValidatorOptions: { customOptions: { coerceTypes: false, allErrors: true } }
    }
  })
  t.after(() => fastify.close())

  fastify.get('/coerce', {
    schema: { response: { 200: { type: 'object', properties: { n: { type: 'number' } } } } }
  }, () => ({ n: '42' }))

  fastify.get('/all-errors', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: { a: { type: 'number', minimum: 10 }, b: { type: 'number', minimum: 10 } }
        }
      }
    }
  }, () => ({ a: 1, b: 1 }))

  t.assert.deepStrictEqual((await fastify.inject('/coerce')).json(), outputValidationFailure('/n must be number'))
  t.assert.deepStrictEqual(
    (await fastify.inject('/all-errors')).json(),
    outputValidationFailure('/a must be >= 10; /b must be >= 10')
  )

  const strict = Fastify({
    schemaController: { outputValidatorOptions: { customOptions: { strict: true } } }
  })
  t.after(() => strict.close())
  strict.get('/', {
    schema: { response: { 200: { type: 'object', whatever: 'unknown keyword' } } }
  }, () => ({}))

  await t.assert.rejects(strict.ready(), { code: 'FST_ERR_SCH_OUTPUT_VALIDATION_BUILD' })
})

test('the outputValidatorOptions plugins and onCreate reach the default output pool', async t => {
  t.plan(3)
  let created = 0
  const fastify = Fastify({
    schemaController: {
      outputValidatorOptions: {
        onCreate () { created++ },
        plugins: [(ajv) => ajv.addKeyword({ keyword: 'even', validate: (_, data) => data % 2 === 0 })]
      }
    }
  })
  t.after(() => fastify.close())

  fastify.get('/:n', {
    schema: { response: { 200: { type: 'object', properties: { n: { type: 'integer', even: true } } } } }
  }, (request) => ({ n: Number(request.params.n) }))

  t.assert.strictEqual((await fastify.inject('/2')).statusCode, 200)
  t.assert.strictEqual((await fastify.inject('/3')).json().code, 'FST_ERR_SCH_OUTPUT_VALIDATION')
  t.assert.ok(created > 0)
})

test('the default output pool resolves the shared schemas', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addSchema({ $id: 'limit', type: 'object', properties: { n: { type: 'number', minimum: 10 } } })
  fastify.get('/:n', {
    schema: { response: { 200: { $ref: 'limit#' } } }
  }, (request) => ({ n: Number(request.params.n) }))

  t.assert.deepStrictEqual((await fastify.inject('/10')).json(), { n: 10 })
  t.assert.deepStrictEqual((await fastify.inject('/1')).json(), outputValidationFailure('/n must be >= 10'))
})

test('compilersFactory.buildOutputValidator replaces the default output pool', async t => {
  t.plan(2)
  const fastify = Fastify({
    schemaController: {
      outputValidatorOptions: { customOptions: { allErrors: true } },
      compilersFactory: {
        buildOutputValidator (externalSchemas, outputValidatorOptions) {
          const ajv = new Ajv(outputValidatorOptions.customOptions)
          for (const id of Object.keys(externalSchemas)) {
            ajv.addSchema(externalSchemas[id], id)
          }
          return ({ schema }) => ajv.compile(schema)
        }
      }
    }
  })
  t.after(() => fastify.close())

  fastify.addSchema({ $id: 'a', type: 'number', minimum: 10 })
  fastify.addSchema({ $id: 'b', type: 'number', minimum: 10 })
  fastify.get('/', {
    schema: {
      response: { 200: { type: 'object', properties: { a: { $ref: 'a#' }, b: { $ref: 'b#' } } } }
    }
  }, () => ({ a: 1, b: 1 }))

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 500)
  t.assert.strictEqual(res.json().message, 'Response validation failed. Errors: /a must be >= 10; /b must be >= 10')
})

test('a custom output validator can reject a payload without errors', async t => {
  t.plan(1)
  const fastify = Fastify({
    schemaController: { compilersFactory: { buildOutputValidator: () => () => () => false } }
  })
  t.after(() => fastify.close())

  fastify.get('/', { schema: { response: atLeastTen } }, () => ({ n: 10 }))

  t.assert.deepStrictEqual((await fastify.inject('/')).json(), {
    statusCode: 500,
    code: 'FST_ERR_SCH_OUTPUT_VALIDATION',
    error: 'Internal Server Error',
    message: 'Response validation failed.'
  })
})

test('Encapsulation: each context validates the responses with its own shared schemas', async t => {
  t.plan(4)
  const fastify = Fastify()
  t.after(() => fastify.close())

  const route = (instance) => instance.get('/:n', {
    schema: { response: { 200: { $ref: 'limit#' } } }
  }, (request) => ({ n: Number(request.params.n) }))

  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'limit', type: 'object', properties: { n: { type: 'number', minimum: 10 } } })
    route(instance)
  }, { prefix: '/min' })

  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'limit', type: 'object', properties: { n: { type: 'number', maximum: 10 } } })
    route(instance)
  }, { prefix: '/max' })

  t.assert.strictEqual((await fastify.inject('/min/7')).json().message, 'Response validation failed. Errors: /n must be >= 10')
  t.assert.deepStrictEqual((await fastify.inject('/min/12')).json(), { n: 12 })
  t.assert.deepStrictEqual((await fastify.inject('/max/7')).json(), { n: 7 })
  t.assert.strictEqual((await fastify.inject('/max/12')).json().message, 'Response validation failed. Errors: /n must be <= 10')
})

test('Encapsulation: a child context inherits the shared schemas of its parent', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addSchema({ $id: 'limit', type: 'object', properties: { n: { type: 'number', minimum: 10 } } })

  fastify.register(async (child) => {
    child.register(async (grandChild) => {
      grandChild.get('/:n', {
        schema: { response: { 200: { $ref: 'limit#' } } }
      }, (request) => ({ n: Number(request.params.n) }))
    })
  })

  t.assert.deepStrictEqual((await fastify.inject('/10')).json(), { n: 10 })
  t.assert.strictEqual((await fastify.inject('/1')).json().code, 'FST_ERR_SCH_OUTPUT_VALIDATION')
})

test('setSchemaController: the outputValidatorOptions of a context apply to its routes only', async t => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  const schema = { response: { 200: { type: 'object', properties: { n: { type: 'number' } } } } }

  fastify.get('/', { schema }, () => ({ n: '42' }))

  fastify.register(async (child) => {
    child.setSchemaController({ outputValidatorOptions: { customOptions: { coerceTypes: false } } })
    child.get('/', { schema }, () => ({ n: '42' }))

    child.register(async (grandChild) => {
      grandChild.get('/nested', { schema }, () => ({ n: '42' }))
    })
  }, { prefix: '/strict' })

  t.assert.deepStrictEqual((await fastify.inject('/')).json(), { n: 42 })
  t.assert.deepStrictEqual((await fastify.inject('/strict')).json(), outputValidationFailure('/n must be number'))
  t.assert.deepStrictEqual((await fastify.inject('/strict/nested')).json(), outputValidationFailure('/n must be number'))
})

test('setSchemaController: a context can replace buildOutputValidator', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addSchema({ $id: 'limit', type: 'object', properties: { n: { type: 'number', minimum: 10 } } })
  const schema = { response: { 200: { $ref: 'limit#' } } }

  fastify.get('/', { schema }, () => ({ n: 1 }))

  fastify.register(async (child) => {
    child.setSchemaController({
      compilersFactory: {
        buildOutputValidator () {
          return () => () => true
        }
      }
    })
    child.get('/', { schema }, () => ({ n: 1 }))
  }, { prefix: '/lenient' })

  t.assert.strictEqual((await fastify.inject('/')).json().code, 'FST_ERR_SCH_OUTPUT_VALIDATION')
  t.assert.deepStrictEqual((await fastify.inject('/lenient')).json(), { n: 1 })
})

test('setOutputValidatorCompiler replaces the default output pool', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  t.assert.strictEqual(fastify.setOutputValidatorCompiler(() => () => true), fastify)
  fastify.get('/', { schema: { response: atLeastTen } }, () => ({ n: 1 }))

  t.assert.deepStrictEqual((await fastify.inject('/')).json(), { n: 1 })
})

test('outputValidatorCompiler is the compiler set by setOutputValidatorCompiler', t => {
  t.plan(1)
  const fastify = Fastify()
  const compiler = () => () => true

  fastify.setOutputValidatorCompiler(compiler)
  t.assert.strictEqual(fastify.outputValidatorCompiler, compiler)
})

test('setOutputValidatorCompiler ignores the outputValidatorOptions and survives an addSchema', async t => {
  t.plan(1)
  const fastify = Fastify({
    schemaController: { outputValidatorOptions: { customOptions: { coerceTypes: false } } }
  })
  t.after(() => fastify.close())

  fastify.setOutputValidatorCompiler(({ schema }) => new Ajv().compile(schema))
  fastify.addSchema({ $id: 'unused', type: 'string' })
  fastify.get('/', { schema: { response: atLeastTen } }, () => ({ n: 1 }))

  t.assert.deepStrictEqual((await fastify.inject('/')).json(), outputValidationFailure('/n must be >= 10'))
})

test('Encapsulation: setOutputValidatorCompiler applies to its context only', async t => {
  t.plan(5)
  const fastify = Fastify()
  t.after(() => fastify.close())

  const acceptAll = () => () => true
  const route = (instance) => instance.get('/', { schema: { response: atLeastTen } }, () => ({ n: 1 }))

  route(fastify)

  fastify.register(async (child) => {
    child.setOutputValidatorCompiler(acceptAll)
    t.assert.strictEqual(child.outputValidatorCompiler, acceptAll)
    route(child)

    child.register(async (grandChild) => {
      grandChild.addSchema({ $id: 'unused', type: 'string' })
      route(grandChild)
    }, { prefix: '/nested' })
  }, { prefix: '/child' })

  t.assert.strictEqual((await fastify.inject('/')).json().code, 'FST_ERR_SCH_OUTPUT_VALIDATION')
  t.assert.deepStrictEqual((await fastify.inject('/child')).json(), { n: 1 })
  t.assert.deepStrictEqual((await fastify.inject('/child/nested')).json(), { n: 1 })
  t.assert.notStrictEqual(fastify.outputValidatorCompiler, acceptAll)
})

test('setOutputValidatorCompiler cannot be called after the instance is started', async t => {
  t.plan(1)
  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.listen({ port: 0 })
  t.assert.throws(() => fastify.setOutputValidatorCompiler(() => () => true), {
    code: 'FST_ERR_INSTANCE_ALREADY_STARTED',
    message: 'Fastify instance is already listening. Cannot call "setOutputValidatorCompiler"!'
  })
})
