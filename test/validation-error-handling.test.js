'use strict'

const { test } = require('tap')
const Joi = require('joi')
const Fastify = require('..')

const schema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      work: { type: 'string' }
    },
    required: ['name', 'work']
  }
}

function echoBody (req, reply) {
  reply.code(200).send(req.body.name)
}

test('should work with valid payload', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.post('/', { schema }, echoBody)

  fastify.inject({
    method: 'POST',
    payload: {
      name: 'michelangelo',
      work: 'sculptor, painter, architect and poet'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.payload, 'michelangelo')
    t.equal(res.statusCode, 200)
  })
})

test('should fail immediately with invalid payload', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.post('/', { schema }, echoBody)

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: "body must have required property 'name'"
    })
    t.equal(res.statusCode, 400)
  })
})

test('should be able to use setErrorHandler specify custom validation error', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.post('/', { schema }, function (req, reply) {
    t.fail('should not be here')
    reply.code(200).send(req.body.name)
  })

  fastify.setErrorHandler(function (error, request, reply) {
    if (error.validation) {
      reply.status(422).send(new Error('validation failed'))
    }
  })

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), {
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: 'validation failed'
    })
    t.equal(res.statusCode, 422)
  })
})

test('validation error has 400 statusCode set', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.setErrorHandler((error, request, reply) => {
    const errorResponse = {
      message: error.message,
      statusCode: error.statusCode || 500
    }

    reply.code(errorResponse.statusCode).send(errorResponse)
  })

  fastify.post('/', { schema }, echoBody)

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      message: "body must have required property 'name'"
    })
    t.equal(res.statusCode, 400)
  })
})

test('error inside custom error handler should have validationContext', t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.post('/', {
    schema,
    validatorCompiler: ({ schema, method, url, httpPart }) => {
      return function (data) {
        return { error: new Error('this failed') }
      }
    }
  }, function (req, reply) {
    t.fail('should not be here')
    reply.code(200).send(req.body.name)
  })

  fastify.setErrorHandler(function (error, request, reply) {
    t.equal(error.validationContext, 'body')
    reply.status(500).send(error)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      name: 'michelangelo',
      work: 'artist'
    },
    url: '/'
  }, () => {})
})

test('error inside custom error handler should have validationContext if specified by custom error handler', t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.post('/', {
    schema,
    validatorCompiler: ({ schema, method, url, httpPart }) => {
      return function (data) {
        const error = new Error('this failed')
        error.validationContext = 'customContext'
        return { error }
      }
    }
  }, function (req, reply) {
    t.fail('should not be here')
    reply.code(200).send(req.body.name)
  })

  fastify.setErrorHandler(function (error, request, reply) {
    t.equal(error.validationContext, 'customContext')
    reply.status(500).send(error)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      name: 'michelangelo',
      work: 'artist'
    },
    url: '/'
  }, () => {})
})

test('should be able to attach validation to request', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.post('/', { schema, attachValidation: true }, function (req, reply) {
    reply.code(400).send(req.validationError.validation)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)

    t.same(res.json(), [{
      keyword: 'required',
      instancePath: '',
      schemaPath: '#/required',
      params: { missingProperty: 'name' },
      message: 'must have required property \'name\''
    }])
    t.equal(res.statusCode, 400)
  })
})

test('should respect when attachValidation is explicitly set to false', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.post('/', { schema, attachValidation: false }, function (req, reply) {
    t.fail('should not be here')
    reply.code(200).send(req.validationError.validation)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), {
      statusCode: 400,
      error: 'Bad Request',
      message: "body must have required property 'name'"
    })
    t.equal(res.statusCode, 400)
  })
})

test('Attached validation error should take precedence over setErrorHandler', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.post('/', { schema, attachValidation: true }, function (req, reply) {
    reply.code(400).send('Attached: ' + req.validationError)
  })

  fastify.setErrorHandler(function (error, request, reply) {
    t.fail('should not be here')
    if (error.validation) {
      reply.status(422).send(new Error('validation failed'))
    }
  })

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.payload, "Attached: Error: body must have required property 'name'")
    t.equal(res.statusCode, 400)
  })
})

test('should handle response validation error', t => {
  t.plan(2)

  const response = {
    200: {
      type: 'object',
      required: ['name', 'work'],
      properties: {
        name: { type: 'string' },
        work: { type: 'string' }
      }
    }
  }

  const fastify = Fastify()

  fastify.get('/', { schema: { response } }, function (req, reply) {
    try {
      reply.code(200).send({ work: 'actor' })
    } catch (error) {
      reply.code(500).send(error)
    }
  })

  fastify.inject({
    method: 'GET',
    payload: { },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, '{"statusCode":500,"error":"Internal Server Error","message":"\\"name\\" is required!"}')
  })
})

test('should handle response validation error with promises', t => {
  t.plan(2)

  const response = {
    200: {
      type: 'object',
      required: ['name', 'work'],
      properties: {
        name: { type: 'string' },
        work: { type: 'string' }
      }
    }
  }

  const fastify = Fastify()

  fastify.get('/', { schema: { response } }, function (req, reply) {
    return Promise.resolve({ work: 'actor' })
  })

  fastify.inject({
    method: 'GET',
    payload: { },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, '{"statusCode":500,"error":"Internal Server Error","message":"\\"name\\" is required!"}')
  })
})

test('should return a defined output message parsing AJV errors', t => {
  t.plan(2)

  const body = {
    type: 'object',
    required: ['name', 'work'],
    properties: {
      name: { type: 'string' },
      work: { type: 'string' }
    }
  }

  const fastify = Fastify()

  fastify.post('/', { schema: { body } }, function (req, reply) {
    t.fail()
  })

  fastify.inject({
    method: 'POST',
    payload: { },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, '{"statusCode":400,"error":"Bad Request","message":"body must have required property \'name\'"}')
  })
})

test('should return a defined output message parsing JOI errors', t => {
  t.plan(2)

  const body = Joi.object().keys({
    name: Joi.string().required(),
    work: Joi.string().required()
  }).required()

  const fastify = Fastify()

  fastify.post('/', {
    schema: { body },
    validatorCompiler: ({ schema, method, url, httpPart }) => {
      return data => schema.validate(data)
    }
  },
  function (req, reply) {
    t.fail()
  })

  fastify.inject({
    method: 'POST',
    payload: {},
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, '{"statusCode":400,"error":"Bad Request","message":"\\"name\\" is required"}')
  })
})

test('should return a defined output message parsing JOI error details', t => {
  t.plan(2)

  const body = Joi.object().keys({
    name: Joi.string().required(),
    work: Joi.string().required()
  }).required()

  const fastify = Fastify()

  fastify.post('/', {
    schema: { body },
    validatorCompiler: ({ schema, method, url, httpPart }) => {
      return data => {
        const validation = schema.validate(data)
        return { error: validation.error.details }
      }
    }
  },
  function (req, reply) {
    t.fail()
  })

  fastify.inject({
    method: 'POST',
    payload: {},
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, '{"statusCode":400,"error":"Bad Request","message":"body \\"name\\" is required"}')
  })
})

test('the custom error formatter context must be the server instance', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.setSchemaErrorFormatter(function (errors, dataVar) {
    t.same(this, fastify)
    return new Error('my error')
  })

  fastify.post('/', { schema }, echoBody)

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'my error'
    })
    t.equal(res.statusCode, 400)
  })
})

test('the custom error formatter context must be the server instance in options', t => {
  t.plan(4)

  const fastify = Fastify({
    schemaErrorFormatter: function (errors, dataVar) {
      t.same(this, fastify)
      return new Error('my error')
    }
  })

  fastify.post('/', { schema }, echoBody)

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'my error'
    })
    t.equal(res.statusCode, 400)
  })
})

test('should call custom error formatter', t => {
  t.plan(6)

  const fastify = Fastify({
    schemaErrorFormatter: (errors, dataVar) => {
      t.equal(errors.length, 1)
      t.equal(errors[0].message, "must have required property 'name'")
      t.equal(dataVar, 'body')
      return new Error('my error')
    }
  })

  fastify.post('/', { schema }, echoBody)

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'my error'
    })
    t.equal(res.statusCode, 400)
  })
})

test('should catch error inside formatter and return message', t => {
  t.plan(3)

  const fastify = Fastify({
    schemaErrorFormatter: (errors, dataVar) => {
      throw new Error('abc')
    }
  })

  fastify.post('/', { schema }, echoBody)

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'abc'
    })
    t.equal(res.statusCode, 500)
    t.end()
  })
})

test('cannot create a fastify instance with wrong type of errorFormatter', t => {
  t.plan(3)

  try {
    Fastify({
      schemaErrorFormatter: async (errors, dataVar) => {
        return new Error('should not execute')
      }
    })
  } catch (err) {
    t.equal(err.message, 'schemaErrorFormatter option should not be an async function')
  }

  try {
    Fastify({
      schemaErrorFormatter: 500
    })
  } catch (err) {
    t.equal(err.message, 'schemaErrorFormatter option should be a function, instead got number')
  }

  try {
    const fastify = Fastify()
    fastify.setSchemaErrorFormatter(500)
  } catch (err) {
    t.equal(err.message, 'schemaErrorFormatter option should be a function, instead got number')
  }
})

test('should register a route based schema error formatter', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.post('/', {
    schema,
    schemaErrorFormatter: (errors, dataVar) => {
      return new Error('abc')
    }
  }, echoBody)

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'abc'
    })
    t.equal(res.statusCode, 400)
    t.end()
  })
})

test('prefer route based error formatter over global one', t => {
  t.plan(9)

  const fastify = Fastify({
    schemaErrorFormatter: (errors, dataVar) => {
      return new Error('abc123')
    }
  })

  fastify.post('/', {
    schema,
    schemaErrorFormatter: (errors, dataVar) => {
      return new Error('123')
    }
  }, echoBody)

  fastify.post('/abc', {
    schema,
    schemaErrorFormatter: (errors, dataVar) => {
      return new Error('abc')
    }
  }, echoBody)

  fastify.post('/test', { schema }, echoBody)

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: '123'
    })
    t.equal(res.statusCode, 400)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/abc'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'abc'
    })
    t.equal(res.statusCode, 400)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/test'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'abc123'
    })
    t.equal(res.statusCode, 400)
  })
})

test('adding schemaErrorFormatter', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.setSchemaErrorFormatter((errors, dataVar) => {
    return new Error('abc')
  })

  fastify.post('/', { schema }, echoBody)

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'abc'
    })
    t.equal(res.statusCode, 400)
    t.end()
  })
})

test('plugin override', t => {
  t.plan(15)

  const fastify = Fastify({
    schemaErrorFormatter: (errors, dataVar) => {
      return new Error('B')
    }
  })

  fastify.register((instance, opts, done) => {
    instance.setSchemaErrorFormatter((errors, dataVar) => {
      return new Error('C')
    })

    instance.post('/d', {
      schema,
      schemaErrorFormatter: (errors, dataVar) => {
        return new Error('D')
      }
    }, function (req, reply) {
      reply.code(200).send(req.body.name)
    })

    instance.post('/c', { schema }, echoBody)

    instance.register((subinstance, opts, done) => {
      subinstance.post('/stillC', { schema }, echoBody)
      done()
    })

    done()
  })

  fastify.post('/b', { schema }, echoBody)

  fastify.post('/', {
    schema,
    schemaErrorFormatter: (errors, dataVar) => {
      return new Error('A')
    }
  }, echoBody)

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'A'
    })
    t.equal(res.statusCode, 400)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/b'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'B'
    })
    t.equal(res.statusCode, 400)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/c'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'C'
    })
    t.equal(res.statusCode, 400)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/d'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'D'
    })
    t.equal(res.statusCode, 400)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/stillC'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'C'
    })
    t.equal(res.statusCode, 400)
  })
})
