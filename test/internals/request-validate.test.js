const tap = require('tap')
const Fastify = require('../../fastify')

tap.test('Request#SchemaValidation', test => {
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

  test.plan(4)

  test.test('#compileValidationSchema', subtest => {
    subtest.plan(4)

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

        await fastify.inject({
          path: '/',
          method: 'GET'
        })
      }
    )
  })

  test.test('#getValidationFunction', subtest => {
    subtest.plan(3)

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

    subtest.test('Should return undefined if no schema compiled', async t => {
      const fastify = Fastify()

      t.plan(1)

      fastify.get('/', (req, reply) => {
        const validate = req.getValidationFunction(defaultSchema)

        t.notOk(validate)

        reply.send({ hello: 'world' })
      })

      await fastify.inject({
        path: '/',
        method: 'GET'
      })
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
  })

  test.test('#validate', subtest => {
    subtest.plan(6)

    subtest.test(
      'Should return true/false if input valid - Route without schema',
      async t => {
        const fastify = Fastify()

        t.plan(2)

        fastify.get('/', (req, reply) => {
          const isNotValid = req.validate({ world: 'string' }, defaultSchema)
          const isValid = req.validate({ hello: 'string' }, defaultSchema)

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
          const ok = req.validate(
            { hello: 'world' },
            defaultSchema,
            'querystring'
          )
          const ok2 = req.validate({ hello: 'world' }, defaultSchema)

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
                t.ok(req.validate({ hello: 'world' }, 'body'))
                t.notOk(req.validate({ hello: [], world: 'foo' }, 'body'))
                break
              case 2:
                t.notOk(req.validate({ foo: 'something' }, 'querystring'))
                t.ok(req.validate({ foo: 'bar' }, 'querystring'))
                break
              case 3:
                t.notOk(req.validate({ 'x-foo': [] }, 'headers'))
                t.ok(req.validate({ 'x-foo': 'something' }, 'headers'))
                break
              case 4:
                t.ok(req.validate({ id: params.id }, 'params'))
                t.notOk(req.validate({ id: 0 }, 'params'))
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
              req.validate({}, 'body')
              break
            case 2:
              req.validate({}, 'querystring')
              break
            case 3:
              req.validate({}, 'query')
              break
            case 4:
              req.validate({ 'x-foo': [] }, 'headers')
              break
            case 5:
              req.validate({ id: 0 }, 'params')
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

    subtest.test(
      'Should throw if missing validation fn for HTTP part and not valid schema provided',
      async t => {
        const fastify = Fastify()

        t.plan(10)

        fastify.get('/:id', (req, reply) => {
          const { params } = req

          switch (parseInt(params.id)) {
            case 1:
              req.validate({}, 1, 'body')
              break
            case 2:
              req.validate({}, [], 'querystring')
              break
            case 3:
              req.validate({}, '', 'query')
              break
            case 4:
              req.validate({ 'x-foo': [] }, null, 'headers')
              break
            case 5:
              req.validate({ id: 0 }, () => {}, 'params')
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
            req.validate({}, 1)
            break
          case 2:
            req.validate({}, '')
            break
          case 3:
            req.validate({}, [])
            break
          case 4:
            req.validate({ 'x-foo': [] }, null)
            break
          case 5:
            req.validate({ id: 0 }, () => {})
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
  })

  test.test('Nested Context', subtest => {
    subtest.plan(2)

    subtest.test('Level_1', tst => {
      tst.plan(3)
      tst.test('#compileValidationSchema', ntst => {
        ntst.plan(4)

        ntst.test(
          'Should return a function - Route without schema',
          async t => {
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
          }
        )

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
                  t.equal(
                    validate,
                    newValidate,
                    'Are the same validate function'
                  )
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

            await fastify.inject({
              path: '/',
              method: 'GET'
            })
          }
        )
      })

      tst.test('#getValidationFunction', ntst => {
        ntst.plan(3)

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

          await fastify.inject({
            path: '/',
            method: 'GET'
          })
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

          await fastify.inject({
            path: '/',
            method: 'GET'
          })
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
                      t.ok(
                        req.getValidationFunction('body')({ hello: 'world' })
                      )
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
      })

      tst.test('#validate', { todo: true }, ntst => {
        ntst.plan(6)

        ntst.test(
          'Should return true/false if input valid - Route without schema',
          async t => {
            const fastify = Fastify()

            t.plan(2)

            fastify.get('/', (req, reply) => {
              const isNotValid = req.validate(
                { world: 'string' },
                defaultSchema
              )
              const isValid = req.validate({ hello: 'string' }, defaultSchema)

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

        ntst.test(
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
              const ok = req.validate(
                { hello: 'world' },
                defaultSchema,
                'querystring'
              )
              const ok2 = req.validate({ hello: 'world' }, defaultSchema)

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

        ntst.test(
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
                    t.ok(req.validate({ hello: 'world' }, 'body'))
                    t.notOk(req.validate({ hello: [], world: 'foo' }, 'body'))
                    break
                  case 2:
                    t.notOk(req.validate({ foo: 'something' }, 'querystring'))
                    t.ok(req.validate({ foo: 'bar' }, 'querystring'))
                    break
                  case 3:
                    t.notOk(req.validate({ 'x-foo': [] }, 'headers'))
                    t.ok(req.validate({ 'x-foo': 'something' }, 'headers'))
                    break
                  case 4:
                    t.ok(req.validate({ id: params.id }, 'params'))
                    t.notOk(req.validate({ id: 0 }, 'params'))
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

        ntst.test(
          'Should throw if missing validation fn for HTTP part and not schema provided',
          async t => {
            const fastify = Fastify()

            t.plan(10)

            fastify.get('/:id', (req, reply) => {
              const { params } = req

              switch (parseInt(params.id)) {
                case 1:
                  req.validate({}, 'body')
                  break
                case 2:
                  req.validate({}, 'querystring')
                  break
                case 3:
                  req.validate({}, 'query')
                  break
                case 4:
                  req.validate({ 'x-foo': [] }, 'headers')
                  break
                case 5:
                  req.validate({ id: 0 }, 'params')
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
                  t.equal(
                    result.code,
                    'FST_ERR_REQ_INVALID_VALIDATION_INVOCATION'
                  )
                })(i)
              )
            }

            await Promise.all(promises)
          }
        )

        ntst.test(
          'Should throw if missing validation fn for HTTP part and not valid schema provided',
          async t => {
            const fastify = Fastify()

            t.plan(10)

            fastify.get('/:id', (req, reply) => {
              const { params } = req

              switch (parseInt(params.id)) {
                case 1:
                  req.validate({}, 1, 'body')
                  break
                case 2:
                  req.validate({}, [], 'querystring')
                  break
                case 3:
                  req.validate({}, '', 'query')
                  break
                case 4:
                  req.validate({ 'x-foo': [] }, null, 'headers')
                  break
                case 5:
                  req.validate({ id: 0 }, () => {}, 'params')
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
                  t.equal(
                    result.code,
                    'FST_ERR_REQ_INVALID_VALIDATION_INVOCATION'
                  )
                })(i)
              )
            }

            await Promise.all(promises)
          }
        )

        ntst.test('Should throw if invalid schema passed', async t => {
          const fastify = Fastify()

          t.plan(10)

          fastify.get('/:id', (req, reply) => {
            const { params } = req

            switch (parseInt(params.id)) {
              case 1:
                req.validate({}, 1)
                break
              case 2:
                req.validate({}, '')
                break
              case 3:
                req.validate({}, [])
                break
              case 4:
                req.validate({ 'x-foo': [] }, null)
                break
              case 5:
                req.validate({ id: 0 }, () => {})
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
                t.equal(
                  result.code,
                  'FST_ERR_REQ_INVALID_VALIDATION_INVOCATION'
                )
              })(i)
            )
          }

          await Promise.all(promises)
        })
      })
    })

    subtest.test('Level_2', { skip: true }, tst => {
      tst.test('Level_2.1', { skip: true })
      tst.test('Level_2.2', { skip: true })
    })
  })
})
