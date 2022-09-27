'use strict'

const { test } = require('tap')
const Ajv = require('ajv')
const { kRequestValidateWeakMap, kRouteContext } = require('../../lib/symbols')
const Fastify = require('../../fastify')

const defaultSchema = {
  type: 'object',
  required: ['hello'],
  properties: {
    hello: { type: 'string' },
    world: { type: 'string' }
  }
}

const requestSchema = {
  params: {
    id: {
      type: 'integer',
      minimum: 1
    }
  },
  querystring: {
    foo: {
      type: 'string',
      enum: ['bar']
    }
  },
  body: defaultSchema,
  headers: {
    'x-foo': {
      type: 'string'
    }
  }
}

test('#compileValidationSchema', subtest => {
  subtest.plan(7)

  subtest.test('Should return a function - Route without schema', async t => {
    const fastify = Fastify()

    t.plan(3)

    fastify.get('/', (req, reply) => {
      const validate = req.compileValidationSchema(defaultSchema)

      t.type(validate, Function)
      t.ok(validate({ hello: 'world' }))
      t.notOk(validate({ world: 'foo' }))

      reply.send({ hello: 'world' })
    })

    await fastify.inject({
      path: '/',
      method: 'GET'
    })
  })

  subtest.test('Validate function errors property should be null after validation when input is valid', async t => {
    const fastify = Fastify()

    t.plan(3)

    fastify.get('/', (req, reply) => {
      const validate = req.compileValidationSchema(defaultSchema)

      t.ok(validate({ hello: 'world' }))
      t.ok(Object.prototype.hasOwnProperty.call(validate, 'errors'))
      t.equal(validate.errors, null)

      reply.send({ hello: 'world' })
    })

    await fastify.inject({
      path: '/',
      method: 'GET'
    })
  })

  subtest.test('Validate function errors property should be an array of errors after validation when input is valid', async t => {
    const fastify = Fastify()

    t.plan(4)

    fastify.get('/', (req, reply) => {
      const validate = req.compileValidationSchema(defaultSchema)

      t.notOk(validate({ world: 'foo' }))
      t.ok(Object.prototype.hasOwnProperty.call(validate, 'errors'))
      t.ok(Array.isArray(validate.errors))
      t.ok(validate.errors.length > 0)

      reply.send({ hello: 'world' })
    })

    await fastify.inject({
      path: '/',
      method: 'GET'
    })
  })

  subtest.test(
    'Should reuse the validate fn across multiple invocations - Route without schema',
    async t => {
      const fastify = Fastify()
      let validate = null
      let counter = 0

      t.plan(16)

      fastify.get('/', (req, reply) => {
        counter++
        if (counter > 1) {
          const newValidate = req.compileValidationSchema(defaultSchema)
          t.equal(validate, newValidate, 'Are the same validate function')
          validate = newValidate
        } else {
          validate = req.compileValidationSchema(defaultSchema)
        }

        t.type(validate, Function)
        t.ok(validate({ hello: 'world' }))
        t.notOk(validate({ world: 'foo' }))

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

  subtest.test('Should return a function - Route with schema', async t => {
    const fastify = Fastify()

    t.plan(3)

    fastify.post(
      '/',
      {
        schema: {
          body: defaultSchema
        }
      },
      (req, reply) => {
        const validate = req.compileValidationSchema(defaultSchema)

        t.type(validate, Function)
        t.ok(validate({ hello: 'world' }))
        t.notOk(validate({ world: 'foo' }))

        reply.send({ hello: 'world' })
      }
    )

    await fastify.inject({
      path: '/',
      method: 'POST',
      payload: {
        hello: 'world',
        world: 'foo'
      }
    })
  })

  subtest.test(
    'Should use the custom validator compiler for the route',
    async t => {
      const fastify = Fastify()
      let called = 0
      const custom = ({ schema, httpPart, url, method }) => {
        t.equal(schema, defaultSchema)
        t.equal(url, '/')
        t.equal(method, 'GET')
        t.equal(httpPart, 'querystring')

        return input => {
          called++
          t.same(input, { hello: 'world' })
          return true
        }
      }

      t.plan(10)

      fastify.get('/', { validatorCompiler: custom }, (req, reply) => {
        const first = req.compileValidationSchema(defaultSchema, 'querystring')
        const second = req.compileValidationSchema(defaultSchema, 'querystring')

        t.equal(first, second)
        t.ok(first({ hello: 'world' }))
        t.ok(second({ hello: 'world' }))
        t.equal(called, 2)

        reply.send({ hello: 'world' })
      })

      await fastify.inject({
        path: '/',
        method: 'GET'
      })
    }
  )

  subtest.test(
    'Should instantiate a WeakMap when executed for first time',
    async t => {
      const fastify = Fastify()

      t.plan(5)

      fastify.get('/', (req, reply) => {
        t.equal(req[kRouteContext][kRequestValidateWeakMap], null)
        t.type(req.compileValidationSchema(defaultSchema), Function)
        t.type(req[kRouteContext][kRequestValidateWeakMap], WeakMap)
        t.type(req.compileValidationSchema(Object.assign({}, defaultSchema)), Function)
        t.type(req[kRouteContext][kRequestValidateWeakMap], WeakMap)

        reply.send({ hello: 'world' })
      })

      await fastify.inject({
        path: '/',
        method: 'GET'
      })
    }
  )
})

test('#getValidationFunction', subtest => {
  subtest.plan(6)

  subtest.test('Should return a validation function', async t => {
    const fastify = Fastify()

    t.plan(1)

    fastify.get('/', (req, reply) => {
      const original = req.compileValidationSchema(defaultSchema)
      const referenced = req.getValidationFunction(defaultSchema)

      t.equal(original, referenced)

      reply.send({ hello: 'world' })
    })

    await fastify.inject({
      path: '/',
      method: 'GET'
    })
  })

  subtest.test('Validate function errors property should be null after validation when input is valid', async t => {
    const fastify = Fastify()

    t.plan(3)

    fastify.get('/', (req, reply) => {
      req.compileValidationSchema(defaultSchema)
      const validate = req.getValidationFunction(defaultSchema)

      t.ok(validate({ hello: 'world' }))
      t.ok(Object.prototype.hasOwnProperty.call(validate, 'errors'))
      t.equal(validate.errors, null)

      reply.send({ hello: 'world' })
    })

    await fastify.inject({
      path: '/',
      method: 'GET'
    })
  })

  subtest.test('Validate function errors property should be an array of errors after validation when input is valid', async t => {
    const fastify = Fastify()

    t.plan(4)

    fastify.get('/', (req, reply) => {
      req.compileValidationSchema(defaultSchema)
      const validate = req.getValidationFunction(defaultSchema)

      t.notOk(validate({ world: 'foo' }))
      t.ok(Object.prototype.hasOwnProperty.call(validate, 'errors'))
      t.ok(Array.isArray(validate.errors))
      t.ok(validate.errors.length > 0)

      reply.send({ hello: 'world' })
    })

    await fastify.inject({
      path: '/',
      method: 'GET'
    })
  })

  subtest.test('Should return undefined if no schema compiled', async t => {
    const fastify = Fastify()

    t.plan(2)

    fastify.get('/', (req, reply) => {
      const validate = req.getValidationFunction(defaultSchema)
      t.notOk(validate)

      const validateFn = req.getValidationFunction(42)
      t.notOk(validateFn)

      reply.send({ hello: 'world' })
    })

    await fastify.inject('/')
  })

  subtest.test(
    'Should return the validation function from each HTTP part',
    async t => {
      const fastify = Fastify()
      let headerValidation = null
      let customValidation = null

      t.plan(15)

      fastify.post(
        '/:id',
        {
          schema: requestSchema
        },
        (req, reply) => {
          const { params } = req

          switch (params.id) {
            case 1:
              customValidation = req.compileValidationSchema(defaultSchema)
              t.ok(req.getValidationFunction('body'))
              t.ok(req.getValidationFunction('body')({ hello: 'world' }))
              t.notOk(req.getValidationFunction('body')({ world: 'hello' }))
              break
            case 2:
              headerValidation = req.getValidationFunction('headers')
              t.ok(headerValidation)
              t.ok(headerValidation({ 'x-foo': 'world' }))
              t.notOk(headerValidation({ 'x-foo': [] }))
              break
            case 3:
              t.ok(req.getValidationFunction('params'))
              t.ok(req.getValidationFunction('params')({ id: 123 }))
              t.notOk(req.getValidationFunction('params'({ id: 1.2 })))
              break
            case 4:
              t.ok(req.getValidationFunction('querystring'))
              t.ok(req.getValidationFunction('querystring')({ foo: 'bar' }))
              t.notOk(
                req.getValidationFunction('querystring')({ foo: 'not-bar' })
              )
              break
            case 5:
              t.equal(
                customValidation,
                req.getValidationFunction(defaultSchema)
              )
              t.ok(customValidation({ hello: 'world' }))
              t.notOk(customValidation({}))
              t.equal(headerValidation, req.getValidationFunction('headers'))
              break
            default:
              t.fail('Invalid id')
          }

          reply.send({ hello: 'world' })
        }
      )

      const promises = []

      for (let i = 1; i < 6; i++) {
        promises.push(
          fastify.inject({
            path: `/${i}`,
            method: 'post',
            query: { foo: 'bar' },
            payload: {
              hello: 'world'
            },
            headers: {
              'x-foo': 'x-bar'
            }
          })
        )
      }

      await Promise.all(promises)
    }
  )

  subtest.test('Should not set a WeakMap if there is no schema', async t => {
    const fastify = Fastify()

    t.plan(1)

    fastify.get('/', (req, reply) => {
      req.getValidationFunction(defaultSchema)
      req.getValidationFunction('body')

      t.equal(req[kRouteContext][kRequestValidateWeakMap], null)
      reply.send({ hello: 'world' })
    })

    await fastify.inject({
      path: '/',
      method: 'GET'
    })
  })
})

test('#validate', subtest => {
  subtest.plan(7)

  subtest.test(
    'Should return true/false if input valid - Route without schema',
    async t => {
      const fastify = Fastify()

      t.plan(2)

      fastify.get('/', (req, reply) => {
        const isNotValid = req.validateInput({ world: 'string' }, defaultSchema)
        const isValid = req.validateInput({ hello: 'string' }, defaultSchema)

        t.notOk(isNotValid)
        t.ok(isValid)

        reply.send({ hello: 'world' })
      })

      await fastify.inject({
        path: '/',
        method: 'GET'
      })
    }
  )

  subtest.test(
    'Should use the custom validator compiler for the route',
    async t => {
      const fastify = Fastify()
      let called = 0
      const custom = ({ schema, httpPart, url, method }) => {
        t.equal(schema, defaultSchema)
        t.equal(url, '/')
        t.equal(method, 'GET')
        t.equal(httpPart, 'querystring')

        return input => {
          called++
          t.same(input, { hello: 'world' })
          return true
        }
      }

      t.plan(9)

      fastify.get('/', { validatorCompiler: custom }, (req, reply) => {
        const ok = req.validateInput(
          { hello: 'world' },
          defaultSchema,
          'querystring'
        )
        const ok2 = req.validateInput({ hello: 'world' }, defaultSchema)

        t.ok(ok)
        t.ok(ok2)
        t.equal(called, 2)

        reply.send({ hello: 'world' })
      })

      await fastify.inject({
        path: '/',
        method: 'GET'
      })
    }
  )

  subtest.test(
    'Should return true/false if input valid - With Schema for Route defined',
    async t => {
      const fastify = Fastify()

      t.plan(8)

      fastify.post(
        '/:id',
        {
          schema: requestSchema
        },
        (req, reply) => {
          const { params } = req

          switch (params.id) {
            case 1:
              t.ok(req.validateInput({ hello: 'world' }, 'body'))
              t.notOk(req.validateInput({ hello: [], world: 'foo' }, 'body'))
              break
            case 2:
              t.notOk(req.validateInput({ foo: 'something' }, 'querystring'))
              t.ok(req.validateInput({ foo: 'bar' }, 'querystring'))
              break
            case 3:
              t.notOk(req.validateInput({ 'x-foo': [] }, 'headers'))
              t.ok(req.validateInput({ 'x-foo': 'something' }, 'headers'))
              break
            case 4:
              t.ok(req.validateInput({ id: params.id }, 'params'))
              t.notOk(req.validateInput({ id: 0 }, 'params'))
              break
            default:
              t.fail('Invalid id')
          }

          reply.send({ hello: 'world' })
        }
      )

      const promises = []

      for (let i = 1; i < 5; i++) {
        promises.push(
          fastify.inject({
            path: `/${i}`,
            method: 'post',
            query: { foo: 'bar' },
            payload: {
              hello: 'world'
            },
            headers: {
              'x-foo': 'x-bar'
            }
          })
        )
      }

      await Promise.all(promises)
    }
  )

  subtest.test(
    'Should throw if missing validation fn for HTTP part and not schema provided',
    async t => {
      const fastify = Fastify()

      t.plan(10)

      fastify.get('/:id', (req, reply) => {
        const { params } = req

        switch (parseInt(params.id)) {
          case 1:
            req.validateInput({}, 'body')
            break
          case 2:
            req.validateInput({}, 'querystring')
            break
          case 3:
            req.validateInput({}, 'query')
            break
          case 4:
            req.validateInput({ 'x-foo': [] }, 'headers')
            break
          case 5:
            req.validateInput({ id: 0 }, 'params')
            break
          default:
            t.fail('Invalid id')
        }
      })

      const promises = []

      for (let i = 1; i < 6; i++) {
        promises.push(
          (async j => {
            const response = await fastify.inject(`/${j}`)

            const result = response.json()
            t.equal(result.statusCode, 500)
            t.equal(result.code, 'FST_ERR_REQ_INVALID_VALIDATION_INVOCATION')
          })(i)
        )
      }

      await Promise.all(promises)
    }
  )

  subtest.test(
    'Should throw if missing validation fn for HTTP part and not valid schema provided',
    async t => {
      const fastify = Fastify()

      t.plan(10)

      fastify.get('/:id', (req, reply) => {
        const { params } = req

        switch (parseInt(params.id)) {
          case 1:
            req.validateInput({}, 1, 'body')
            break
          case 2:
            req.validateInput({}, [], 'querystring')
            break
          case 3:
            req.validateInput({}, '', 'query')
            break
          case 4:
            req.validateInput({ 'x-foo': [] }, null, 'headers')
            break
          case 5:
            req.validateInput({ id: 0 }, () => {}, 'params')
            break
          default:
            t.fail('Invalid id')
        }
      })

      const promises = []

      for (let i = 1; i < 6; i++) {
        promises.push(
          (async j => {
            const response = await fastify.inject({
              path: `/${j}`,
              method: 'GET'
            })

            const result = response.json()
            t.equal(result.statusCode, 500)
            t.equal(result.code, 'FST_ERR_REQ_INVALID_VALIDATION_INVOCATION')
          })(i)
        )
      }

      await Promise.all(promises)
    }
  )

  subtest.test('Should throw if invalid schema passed', async t => {
    const fastify = Fastify()

    t.plan(10)

    fastify.get('/:id', (req, reply) => {
      const { params } = req

      switch (parseInt(params.id)) {
        case 1:
          req.validateInput({}, 1)
          break
        case 2:
          req.validateInput({}, '')
          break
        case 3:
          req.validateInput({}, [])
          break
        case 4:
          req.validateInput({ 'x-foo': [] }, null)
          break
        case 5:
          req.validateInput({ id: 0 }, () => {})
          break
        default:
          t.fail('Invalid id')
      }
    })

    const promises = []

    for (let i = 1; i < 6; i++) {
      promises.push(
        (async j => {
          const response = await fastify.inject({
            path: `/${j}`,
            method: 'GET'
          })

          const result = response.json()
          t.equal(result.statusCode, 500)
          t.equal(result.code, 'FST_ERR_REQ_INVALID_VALIDATION_INVOCATION')
        })(i)
      )
    }

    await Promise.all(promises)
  })

  subtest.test(
    'Should set a WeakMap if compiling the very first schema',
    async t => {
      const fastify = Fastify()

      t.plan(3)

      fastify.get('/', (req, reply) => {
        t.equal(req[kRouteContext][kRequestValidateWeakMap], null)
        t.equal(req.validateInput({ hello: 'world' }, defaultSchema), true)
        t.type(req[kRouteContext][kRequestValidateWeakMap], WeakMap)

        reply.send({ hello: 'world' })
      })

      await fastify.inject({
        path: '/',
        method: 'GET'
      })
    }
  )
})

test('Nested Context', subtest => {
  subtest.plan(1)

  subtest.test('Level_1', tst => {
    tst.plan(3)
    tst.test('#compileValidationSchema', ntst => {
      ntst.plan(4)

      ntst.test('Should return a function - Route without schema', async t => {
        const fastify = Fastify()

        fastify.register((instance, opts, next) => {
          instance.get('/', (req, reply) => {
            const validate = req.compileValidationSchema(defaultSchema)

            t.type(validate, Function)
            t.ok(validate({ hello: 'world' }))
            t.notOk(validate({ world: 'foo' }))

            reply.send({ hello: 'world' })
          })

          next()
        })

        t.plan(3)

        await fastify.inject({
          path: '/',
          method: 'GET'
        })
      })

      ntst.test(
        'Should reuse the validate fn across multiple invocations - Route without schema',
        async t => {
          const fastify = Fastify()
          let validate = null
          let counter = 0

          t.plan(16)

          fastify.register((instance, opts, next) => {
            instance.get('/', (req, reply) => {
              counter++
              if (counter > 1) {
                const newValidate = req.compileValidationSchema(defaultSchema)
                t.equal(validate, newValidate, 'Are the same validate function')
                validate = newValidate
              } else {
                validate = req.compileValidationSchema(defaultSchema)
              }

              t.type(validate, Function)
              t.ok(validate({ hello: 'world' }))
              t.notOk(validate({ world: 'foo' }))

              reply.send({ hello: 'world' })
            })

            next()
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

      ntst.test('Should return a function - Route with schema', async t => {
        const fastify = Fastify()

        t.plan(3)

        fastify.register((instance, opts, next) => {
          instance.post(
            '/',
            {
              schema: {
                body: defaultSchema
              }
            },
            (req, reply) => {
              const validate = req.compileValidationSchema(defaultSchema)

              t.type(validate, Function)
              t.ok(validate({ hello: 'world' }))
              t.notOk(validate({ world: 'foo' }))

              reply.send({ hello: 'world' })
            }
          )

          next()
        })

        await fastify.inject({
          path: '/',
          method: 'POST',
          payload: {
            hello: 'world',
            world: 'foo'
          }
        })
      })

      ntst.test(
        'Should use the custom validator compiler for the route',
        async t => {
          const fastify = Fastify()
          let called = 0

          t.plan(10)

          fastify.register((instance, opts, next) => {
            const custom = ({ schema, httpPart, url, method }) => {
              t.equal(schema, defaultSchema)
              t.equal(url, '/')
              t.equal(method, 'GET')
              t.equal(httpPart, 'querystring')

              return input => {
                called++
                t.same(input, { hello: 'world' })
                return true
              }
            }

            fastify.get('/', { validatorCompiler: custom }, (req, reply) => {
              const first = req.compileValidationSchema(
                defaultSchema,
                'querystring'
              )
              const second = req.compileValidationSchema(
                defaultSchema,
                'querystring'
              )

              t.equal(first, second)
              t.ok(first({ hello: 'world' }))
              t.ok(second({ hello: 'world' }))
              t.equal(called, 2)

              reply.send({ hello: 'world' })
            })

            next()
          })

          await fastify.inject('/')
        }
      )
    })

    tst.test('#getValidationFunction', ntst => {
      ntst.plan(6)

      ntst.test('Should return a validation function', async t => {
        const fastify = Fastify()

        t.plan(1)

        fastify.register((instance, opts, next) => {
          instance.get('/', (req, reply) => {
            const original = req.compileValidationSchema(defaultSchema)
            const referenced = req.getValidationFunction(defaultSchema)

            t.equal(original, referenced)

            reply.send({ hello: 'world' })
          })

          next()
        })

        await fastify.inject('/')
      })

      ntst.test('Should return undefined if no schema compiled', async t => {
        const fastify = Fastify()

        t.plan(1)

        fastify.register((instance, opts, next) => {
          instance.get('/', (req, reply) => {
            const validate = req.getValidationFunction(defaultSchema)

            t.notOk(validate)

            reply.send({ hello: 'world' })
          })

          next()
        })

        await fastify.inject('/')
      })

      ntst.test(
        'Should return the validation function from each HTTP part',
        async t => {
          const fastify = Fastify()
          let headerValidation = null
          let customValidation = null

          t.plan(15)

          fastify.register((instance, opts, next) => {
            instance.post(
              '/:id',
              {
                schema: requestSchema
              },
              (req, reply) => {
                const { params } = req

                switch (params.id) {
                  case 1:
                    customValidation = req.compileValidationSchema(
                      defaultSchema
                    )
                    t.ok(req.getValidationFunction('body'))
                    t.ok(req.getValidationFunction('body')({ hello: 'world' }))
                    t.notOk(
                      req.getValidationFunction('body')({ world: 'hello' })
                    )
                    break
                  case 2:
                    headerValidation = req.getValidationFunction('headers')
                    t.ok(headerValidation)
                    t.ok(headerValidation({ 'x-foo': 'world' }))
                    t.notOk(headerValidation({ 'x-foo': [] }))
                    break
                  case 3:
                    t.ok(req.getValidationFunction('params'))
                    t.ok(req.getValidationFunction('params')({ id: 123 }))
                    t.notOk(req.getValidationFunction('params'({ id: 1.2 })))
                    break
                  case 4:
                    t.ok(req.getValidationFunction('querystring'))
                    t.ok(
                      req.getValidationFunction('querystring')({ foo: 'bar' })
                    )
                    t.notOk(
                      req.getValidationFunction('querystring')({
                        foo: 'not-bar'
                      })
                    )
                    break
                  case 5:
                    t.equal(
                      customValidation,
                      req.getValidationFunction(defaultSchema)
                    )
                    t.ok(customValidation({ hello: 'world' }))
                    t.notOk(customValidation({}))
                    t.equal(
                      headerValidation,
                      req.getValidationFunction('headers')
                    )
                    break
                  default:
                    t.fail('Invalid id')
                }

                reply.send({ hello: 'world' })
              }
            )

            next()
          })
          const promises = []

          for (let i = 1; i < 6; i++) {
            promises.push(
              fastify.inject({
                path: `/${i}`,
                method: 'post',
                query: { foo: 'bar' },
                payload: {
                  hello: 'world'
                },
                headers: {
                  'x-foo': 'x-bar'
                }
              })
            )
          }

          await Promise.all(promises)
        }
      )

      ntst.test('Should return a validation function - nested', async t => {
        const fastify = Fastify()
        let called = false
        const custom = ({ schema, httpPart, url, method }) => {
          t.equal(schema, defaultSchema)
          t.equal(url, '/')
          t.equal(method, 'GET')
          t.notOk(httpPart)

          called = true
          return () => true
        }

        t.plan(6)

        fastify.setValidatorCompiler(custom)

        fastify.register((instance, opts, next) => {
          instance.get('/', (req, reply) => {
            const original = req.compileValidationSchema(defaultSchema)
            const referenced = req.getValidationFunction(defaultSchema)

            t.equal(original, referenced)
            t.equal(called, true)

            reply.send({ hello: 'world' })
          })

          next()
        })

        await fastify.inject('/')
      })

      ntst.test(
        'Should return undefined if no schema compiled - nested',
        async t => {
          const fastify = Fastify()
          let called = 0
          const custom = ({ schema, httpPart, url, method }) => {
            called++
            return () => true
          }

          t.plan(3)

          fastify.setValidatorCompiler(custom)

          fastify.get('/', (req, reply) => {
            const validate = req.compileValidationSchema(defaultSchema)

            t.equal(typeof validate, 'function')

            reply.send({ hello: 'world' })
          })

          fastify.register(
            (instance, opts, next) => {
              instance.get('/', (req, reply) => {
                const validate = req.getValidationFunction(defaultSchema)

                t.notOk(validate)
                t.equal(called, 1)

                reply.send({ hello: 'world' })
              })

              next()
            },
            { prefix: '/nested' }
          )

          await fastify.inject('/')
          await fastify.inject('/nested')
        }
      )

      ntst.test('Should per-route defined validation compiler', async t => {
        const fastify = Fastify()
        let validateParent
        let validateChild
        let calledParent = 0
        let calledChild = 0
        const customParent = ({ schema, httpPart, url, method }) => {
          calledParent++
          return () => true
        }

        const customChild = ({ schema, httpPart, url, method }) => {
          calledChild++
          return () => true
        }

        t.plan(5)

        fastify.setValidatorCompiler(customParent)

        fastify.get('/', (req, reply) => {
          validateParent = req.compileValidationSchema(defaultSchema)

          t.equal(typeof validateParent, 'function')

          reply.send({ hello: 'world' })
        })

        fastify.register(
          (instance, opts, next) => {
            instance.get(
              '/',
              {
                validatorCompiler: customChild
              },
              (req, reply) => {
                const validate1 = req.compileValidationSchema(defaultSchema)
                validateChild = req.getValidationFunction(defaultSchema)

                t.equal(validate1, validateChild)
                t.not(validateParent, validateChild)
                t.equal(calledParent, 1)
                t.equal(calledChild, 1)

                reply.send({ hello: 'world' })
              }
            )

            next()
          },
          { prefix: '/nested' }
        )

        await fastify.inject('/')
        await fastify.inject('/nested')
      })
    })

    tst.test('#validate', ntst => {
      ntst.plan(3)

      ntst.test(
        'Should return true/false if input valid - Route without schema',
        async t => {
          const fastify = Fastify()

          t.plan(2)

          fastify.register((instance, opts, next) => {
            instance.get('/', (req, reply) => {
              const isNotValid = req.validateInput(
                { world: 'string' },
                defaultSchema
              )
              const isValid = req.validateInput({ hello: 'string' }, defaultSchema)

              t.notOk(isNotValid)
              t.ok(isValid)

              reply.send({ hello: 'world' })
            })

            next()
          })

          await fastify.inject('/')
        }
      )

      ntst.test(
        'Should use the custom validator compiler for the route',
        async t => {
          const fastify = Fastify()
          let parentCalled = 0
          let childCalled = 0
          const customParent = () => {
            parentCalled++

            return () => true
          }

          const customChild = ({ schema, httpPart, url, method }) => {
            t.equal(schema, defaultSchema)
            t.equal(url, '/')
            t.equal(method, 'GET')
            t.equal(httpPart, 'querystring')

            return input => {
              childCalled++
              t.same(input, { hello: 'world' })
              return true
            }
          }

          t.plan(10)

          fastify.setValidatorCompiler(customParent)

          fastify.register((instance, opts, next) => {
            instance.get(
              '/',
              { validatorCompiler: customChild },
              (req, reply) => {
                const ok = req.validateInput(
                  { hello: 'world' },
                  defaultSchema,
                  'querystring'
                )
                const ok2 = req.validateInput({ hello: 'world' }, defaultSchema)

                t.ok(ok)
                t.ok(ok2)
                t.equal(childCalled, 2)
                t.equal(parentCalled, 0)

                reply.send({ hello: 'world' })
              }
            )

            next()
          })

          await fastify.inject('/')
        }
      )

      ntst.test(
        'Should return true/false if input valid - With Schema for Route defined and scoped validator compiler',
        async t => {
          const validator = new Ajv()
          const fastify = Fastify()
          const childCounter = {
            query: 0,
            body: 0,
            params: 0,
            headers: 0
          }
          let parentCalled = 0

          const parent = () => {
            parentCalled++
            return () => true
          }
          const child = ({ schema, httpPart, url, method }) => {
            httpPart = httpPart === 'querystring' ? 'query' : httpPart
            const validate = validator.compile(schema)

            return input => {
              childCounter[httpPart]++
              return validate(input)
            }
          }

          t.plan(13)

          fastify.setValidatorCompiler(parent)
          fastify.register((instance, opts, next) => {
            instance.setValidatorCompiler(child)
            instance.post(
              '/:id',
              {
                schema: requestSchema
              },
              (req, reply) => {
                const { params } = req

                switch (parseInt(params.id)) {
                  case 1:
                    t.ok(req.validateInput({ hello: 'world' }, 'body'))
                    t.notOk(req.validateInput({ hello: [], world: 'foo' }, 'body'))
                    break
                  case 2:
                    t.notOk(req.validateInput({ foo: 'something' }, 'querystring'))
                    t.ok(req.validateInput({ foo: 'bar' }, 'querystring'))
                    break
                  case 3:
                    t.notOk(req.validateInput({ 'x-foo': [] }, 'headers'))
                    t.ok(req.validateInput({ 'x-foo': 'something' }, 'headers'))
                    break
                  case 4:
                    t.ok(req.validateInput({ id: 1 }, 'params'))
                    t.notOk(req.validateInput({ id: params.id }, 'params'))
                    break
                  default:
                    t.fail('Invalid id')
                }

                reply.send({ hello: 'world' })
              }
            )

            next()
          })

          const promises = []

          for (let i = 1; i < 5; i++) {
            promises.push(
              fastify.inject({
                path: `/${i}`,
                method: 'post',
                query: {},
                payload: {
                  hello: 'world'
                }
              })
            )
          }

          await Promise.all(promises)

          t.equal(childCounter.query, 6) // 4 calls made + 2 custom validations
          t.equal(childCounter.headers, 6) // 4 calls made + 2 custom validations
          t.equal(childCounter.body, 6) // 4 calls made + 2 custom validations
          t.equal(childCounter.params, 6) // 4 calls made + 2 custom validations
          t.equal(parentCalled, 0)
        }
      )
    })
  })
})
