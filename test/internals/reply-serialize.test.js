const tap = require('tap')
const Fastify = require('../../fastify')

tap.test('Reply#serialize', test => {
  const defaultSchema = {
    type: 'object',
    required: ['hello'],
    properties: {
      hello: { type: 'string' },
      world: { type: 'string' }
    }
  }
  const responseSchema = {
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

  test.plan(3)

  test.test('Reply#compileSerializationSchema', subtest => {
    subtest.plan(3)

    subtest.test('Should return a serialization function', async t => {
      const fastify = Fastify()

      t.plan(4)

      fastify.get('/', (req, reply) => {
        const serialize = reply.compileSerializationSchema(defaultSchema)
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

    subtest.test(
      'Should reuse the serialize fn across multiple invocations - Route without schema',
      async t => {
        const fastify = Fastify()
        let serialize = null
        let counter = 0

        t.plan(16)

        fastify.get('/', (req, reply) => {
          const input = { hello: 'world' }
          counter++
          if (counter > 1) {
            const newSerialize = reply.compileSerializationSchema(defaultSchema)
            t.equal(serialize, newSerialize, 'Are the same validate function')
            serialize = newSerialize
          } else {
            serialize = reply.compileSerializationSchema(defaultSchema)
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
          fastify.inject({
            path: '/',
            method: 'GET'
          }),
          fastify.inject({
            path: '/',
            method: 'GET'
          }),
          fastify.inject({
            path: '/',
            method: 'GET'
          }),
          fastify.inject({
            path: '/',
            method: 'GET'
          })
        ])

        t.equal(counter, 4)
      }
    )

    subtest.test(
      'Should use the custom serializer compiler for the route',
      async t => {
        const fastify = Fastify()
        let called = 0
        const custom = ({ schema, httpStatus, url, method }) => {
          t.equal(schema, defaultSchema)
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

        fastify.get('/', { serializerCompiler: custom }, (req, reply) => {
          const input = { hello: 'world' }
          const first = reply.compileSerializationSchema(defaultSchema, '201')
          const second = reply.compileSerializationSchema(defaultSchema, '201')

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
  })

  test.test('Reply#getSerializationFunction', subtest => {
    subtest.plan(2)

    subtest.test(
      'Should retrieve the serialization function from the Schema definition',
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

        t.plan(8)

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

            if (parseInt(id) === 1) {
              try {
                const serialize4xx = reply.getSerializationFunction('4xx')
                const serialize201 = reply.getSerializationFunction(201)

                cached4xx = serialize4xx
                cached201 = serialize201

                t.type(serialize4xx, Function)
                t.type(serialize201, Function)
                t.equal(serialize4xx(okInput4xx), JSON.stringify(okInput4xx))
                t.equal(serialize201(okInput201), JSON.stringify(okInput201))

                try {
                  serialize4xx(notOkInput4xx)
                } catch (err) {
                  t.equal(err.message, 'The value "something" cannot be converted to an integer.')
                }

                try {
                  serialize201(notOkInput201)
                } catch (err) {
                  t.equal(err.message, '"status" is required!')
                }

                reply.status(201).send(okInput201)
              } catch (error) {
                console.log(error)
              }
            } else {
              const serialize201 = reply.getSerializationFunction(201)
              const serialize4xx = reply.getSerializationFunction('4xx')

              t.equal(serialize4xx, cached4xx)
              t.equal(serialize201, cached201)
              reply.statys(401).send(okInput4xx)
            }
          }
        )

        await Promise.all([
          fastify.inject({
            path: '/1',
            method: 'GET'
          }),
          fastify.inject({
            path: '/2',
            method: 'GET'
          })
        ])
      }
    )

    subtest.test(
      'Should retrieve the serialization function from the cached one',
      { skip: true },
      t => {}
    )
  })

  test.test('Reply#serializeInput', { skip: true }, () => {})
})
