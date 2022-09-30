'use strict'

const { test } = require('tap')
const { kReplySerializeWeakMap, kRouteContext } = require('../../lib/symbols')
const Fastify = require('../../fastify')

function getDefaultSchema () {
  return {
    type: 'object',
    required: ['hello'],
    properties: {
      hello: { type: 'string' },
      world: { type: 'string' }
    }
  }
}

function getResponseSchema () {
  return {
    201: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['ok']
        },
        message: {
          type: 'string'
        }
      }
    },
    '4xx': {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['error']
        },
        code: {
          type: 'integer',
          minimum: 1
        },
        message: {
          type: 'string'
        }
      }
    }
  }
}

test('Reply#compileSerializationSchema', t => {
  t.plan(4)

  t.test('Should return a serialization function', async t => {
    const fastify = Fastify()

    t.plan(4)

    fastify.get('/', (req, reply) => {
      const serialize = reply.compileSerializationSchema(getDefaultSchema())
      const input = { hello: 'world' }
      t.type(serialize, Function)
      t.type(serialize(input), 'string')
      t.equal(serialize(input), JSON.stringify(input))

      try {
        serialize({ world: 'foo' })
      } catch (err) {
        t.equal(err.message, '"hello" is required!')
      }

      reply.send({ hello: 'world' })
    })

    await fastify.inject({
      path: '/',
      method: 'GET'
    })
  })

  t.test('Should reuse the serialize fn across multiple invocations - Route without schema',
    async t => {
      const fastify = Fastify()
      let serialize = null
      let counter = 0

      t.plan(17)

      const schemaObj = getDefaultSchema()

      fastify.get('/', (req, reply) => {
        const input = { hello: 'world' }
        counter++
        if (counter > 1) {
          const newSerialize = reply.compileSerializationSchema(schemaObj)
          t.equal(serialize, newSerialize, 'Are the same validate function')
          serialize = newSerialize
        } else {
          t.pass('build the schema compilation function')
          serialize = reply.compileSerializationSchema(schemaObj)
        }

        t.type(serialize, Function)
        t.equal(serialize(input), JSON.stringify(input))

        try {
          serialize({ world: 'foo' })
        } catch (err) {
          t.equal(err.message, '"hello" is required!')
        }

        reply.send({ hello: 'world' })
      })

      await Promise.all([
        fastify.inject('/'),
        fastify.inject('/'),
        fastify.inject('/'),
        fastify.inject('/')
      ])

      t.equal(counter, 4)
    }
  )

  t.test('Should use the custom serializer compiler for the route',
    async t => {
      const fastify = Fastify()
      let called = 0
      const custom = ({ schema, httpStatus, url, method }) => {
        t.equal(schema, schemaObj)
        t.equal(url, '/')
        t.equal(method, 'GET')
        t.equal(httpStatus, '201')

        return input => {
          called++
          t.same(input, { hello: 'world' })
          return JSON.stringify(input)
        }
      }

      t.plan(10)
      const schemaObj = getDefaultSchema()

      fastify.get('/', { serializerCompiler: custom }, (req, reply) => {
        const input = { hello: 'world' }
        const first = reply.compileSerializationSchema(schemaObj, '201')
        const second = reply.compileSerializationSchema(schemaObj, '201')

        t.equal(first, second)
        t.ok(first(input), JSON.stringify(input))
        t.ok(second(input), JSON.stringify(input))
        t.equal(called, 2)

        reply.send({ hello: 'world' })
      })

      await fastify.inject({
        path: '/',
        method: 'GET'
      })
    }
  )

  t.test('Should build a WeakMap for cache when called', async t => {
    const fastify = Fastify()

    t.plan(4)

    fastify.get('/', (req, reply) => {
      const input = { hello: 'world' }

      t.equal(reply[kRouteContext][kReplySerializeWeakMap], null)
      t.equal(reply.compileSerializationSchema(getDefaultSchema())(input), JSON.stringify(input))
      t.type(reply[kRouteContext][kReplySerializeWeakMap], WeakMap)
      t.equal(reply.compileSerializationSchema(getDefaultSchema())(input), JSON.stringify(input))

      reply.send({ hello: 'world' })
    })

    await fastify.inject({
      path: '/',
      method: 'GET'
    })
  })
})

test('Reply#getSerializationFunction', t => {
  t.plan(3)

  t.test('Should retrieve the serialization function from the Schema definition',
    async t => {
      const fastify = Fastify()
      const okInput201 = {
        status: 'ok',
        message: 'done!'
      }
      const notOkInput201 = {
        message: 'created'
      }
      const okInput4xx = {
        status: 'error',
        code: 2,
        message: 'oops!'
      }
      const notOkInput4xx = {
        status: 'error',
        code: 'something'
      }
      let cached4xx
      let cached201

      t.plan(9)

      const responseSchema = getResponseSchema()

      fastify.get(
        '/:id',
        {
          params: {
            id: {
              type: 'integer'
            }
          },
          schema: {
            response: responseSchema
          }
        },
        (req, reply) => {
          const { id } = req.params

          if (Number(id) === 1) {
            const serialize4xx = reply.getSerializationFunction('4xx')
            const serialize201 = reply.getSerializationFunction(201)
            const serializeUndefined = reply.getSerializationFunction(undefined)

            cached4xx = serialize4xx
            cached201 = serialize201

            t.type(serialize4xx, Function)
            t.type(serialize201, Function)
            t.equal(serialize4xx(okInput4xx), JSON.stringify(okInput4xx))
            t.equal(serialize201(okInput201), JSON.stringify(okInput201))
            t.notOk(serializeUndefined)

            try {
              serialize4xx(notOkInput4xx)
            } catch (err) {
              t.equal(
                err.message,
                'The value "something" cannot be converted to an integer.'
              )
            }

            try {
              serialize201(notOkInput201)
            } catch (err) {
              t.equal(err.message, '"status" is required!')
            }

            reply.status(201).send(okInput201)
          } else {
            const serialize201 = reply.getSerializationFunction(201)
            const serialize4xx = reply.getSerializationFunction('4xx')

            t.equal(serialize4xx, cached4xx)
            t.equal(serialize201, cached201)
            reply.status(401).send(okInput4xx)
          }
        }
      )

      await Promise.all([
        fastify.inject('/1'),
        fastify.inject('/2')
      ])
    }
  )

  t.test('Should retrieve the serialization function from the cached one',
    async t => {
      const fastify = Fastify()

      const schemaObj = getDefaultSchema()

      const okInput = {
        hello: 'world',
        world: 'done!'
      }
      const notOkInput = {
        world: 'done!'
      }
      let cached

      t.plan(6)

      fastify.get(
        '/:id',
        {
          params: {
            id: {
              type: 'integer'
            }
          }
        },
        (req, reply) => {
          const { id } = req.params

          if (Number(id) === 1) {
            const serialize = reply.compileSerializationSchema(schemaObj)

            t.type(serialize, Function)
            t.equal(serialize(okInput), JSON.stringify(okInput))

            try {
              serialize(notOkInput)
            } catch (err) {
              t.equal(err.message, '"hello" is required!')
            }

            cached = serialize
          } else {
            const serialize = reply.getSerializationFunction(schemaObj)

            t.equal(serialize, cached)
            t.equal(serialize(okInput), JSON.stringify(okInput))

            try {
              serialize(notOkInput)
            } catch (err) {
              t.equal(err.message, '"hello" is required!')
            }
          }

          reply.status(201).send(okInput)
        }
      )

      await Promise.all([
        fastify.inject('/1'),
        fastify.inject('/2')
      ])
    }
  )

  t.test('Should not instantiate a WeakMap if it is not needed', async t => {
    const fastify = Fastify()

    t.plan(4)

    fastify.get('/', (req, reply) => {
      t.notOk(reply.getSerializationFunction(getDefaultSchema()))
      t.equal(reply[kRouteContext][kReplySerializeWeakMap], null)
      t.notOk(reply.getSerializationFunction('200'))
      t.equal(reply[kRouteContext][kReplySerializeWeakMap], null)

      reply.send({ hello: 'world' })
    })

    await fastify.inject({
      path: '/',
      method: 'GET'
    })
  })
})

test('Reply#serializeInput', t => {
  t.plan(5)

  t.test(
    'Should throw if missed serialization function from HTTP status',
    async t => {
      const fastify = Fastify()

      t.plan(2)

      fastify.get('/', (req, reply) => {
        reply.serializeInput({}, 201)
      })

      const result = await fastify.inject({
        path: '/',
        method: 'GET'
      })

      t.equal(result.statusCode, 500)
      t.same(result.json(), {
        statusCode: 500,
        code: 'FST_ERR_MISSING_SERIALIZATION_FN',
        error: 'Internal Server Error',
        message: 'Missing serialization function. Key "201"'
      })
    }
  )

  t.test('Should use a serializer fn from HTTP status', async t => {
    const fastify = Fastify()
    const okInput201 = {
      status: 'ok',
      message: 'done!'
    }
    const notOkInput201 = {
      message: 'created'
    }
    const okInput4xx = {
      status: 'error',
      code: 2,
      message: 'oops!'
    }
    const notOkInput4xx = {
      status: 'error',
      code: 'something'
    }

    t.plan(4)

    fastify.get(
      '/',
      {
        params: {
          id: {
            type: 'integer'
          }
        },
        schema: {
          response: getResponseSchema()
        }
      },
      (req, reply) => {
        t.equal(
          reply.serializeInput(okInput4xx, '4xx'),
          JSON.stringify(okInput4xx)
        )
        t.equal(
          reply.serializeInput(okInput201, 201),
          JSON.stringify(okInput201)
        )

        try {
          reply.serializeInput(notOkInput4xx, '4xx')
        } catch (err) {
          t.equal(
            err.message,
            'The value "something" cannot be converted to an integer.'
          )
        }

        try {
          reply.serializeInput(notOkInput201, 201)
        } catch (err) {
          t.equal(err.message, '"status" is required!')
        }

        reply.status(204).send('')
      }
    )

    await fastify.inject({
      path: '/',
      method: 'GET'
    })
  })

  t.test(
    'Should compile a serializer out of a schema if serializer fn missed',
    async t => {
      let compilerCalled = 0
      let serializerCalled = 0
      const testInput = { hello: 'world' }
      const schemaObj = getDefaultSchema()
      const fastify = Fastify()
      const serializerCompiler = ({ schema, httpStatus, method, url }) => {
        t.equal(schema, schemaObj)
        t.notOk(httpStatus)
        t.equal(method, 'GET')
        t.equal(url, '/')

        compilerCalled++
        return input => {
          t.equal(input, testInput)
          serializerCalled++
          return JSON.stringify(input)
        }
      }

      t.plan(10)

      fastify.get('/', { serializerCompiler }, (req, reply) => {
        t.equal(
          reply.serializeInput(testInput, schemaObj),
          JSON.stringify(testInput)
        )

        t.equal(
          reply.serializeInput(testInput, schemaObj),
          JSON.stringify(testInput)
        )

        reply.status(201).send(testInput)
      })

      await fastify.inject({
        path: '/',
        method: 'GET'
      })

      t.equal(compilerCalled, 1)
      t.equal(serializerCalled, 2)
    }
  )

  t.test('Should use a cached serializer fn', async t => {
    let compilerCalled = 0
    let serializerCalled = 0
    let cached
    const testInput = { hello: 'world' }
    const schemaObj = getDefaultSchema()
    const fastify = Fastify()
    const serializer = input => {
      t.equal(input, testInput)
      serializerCalled++
      return JSON.stringify(input)
    }
    const serializerCompiler = ({ schema, httpStatus, method, url }) => {
      t.equal(schema, schemaObj)
      t.notOk(httpStatus)
      t.equal(method, 'GET')
      t.equal(url, '/')

      compilerCalled++
      return serializer
    }

    t.plan(12)

    fastify.get('/', { serializerCompiler }, (req, reply) => {
      t.equal(
        reply.serializeInput(testInput, schemaObj),
        JSON.stringify(testInput)
      )

      cached = reply.getSerializationFunction(schemaObj)

      t.equal(
        reply.serializeInput(testInput, schemaObj),
        cached(testInput)
      )

      reply.status(201).send(testInput)
    })

    await fastify.inject({
      path: '/',
      method: 'GET'
    })

    t.equal(cached, serializer)
    t.equal(compilerCalled, 1)
    t.equal(serializerCalled, 3)
  })

  t.test('Should instantiate a WeakMap after first call', async t => {
    const fastify = Fastify()

    t.plan(3)

    fastify.get('/', (req, reply) => {
      const input = { hello: 'world' }
      t.equal(reply[kRouteContext][kReplySerializeWeakMap], null)
      t.equal(reply.serializeInput(input, getDefaultSchema()), JSON.stringify(input))
      t.type(reply[kRouteContext][kReplySerializeWeakMap], WeakMap)

      reply.send({ hello: 'world' })
    })

    await fastify.inject({
      path: '/',
      method: 'GET'
    })
  })
})
