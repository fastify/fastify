'use strict'

const t = require('tap')
const Joi = require('joi')
const Fastify = require('..')
const test = t.test

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

test('should work with valid payload', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.post('/', { schema }, function (req, reply) {
    reply.code(200).send(req.body.name)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      name: 'michelangelo',
      work: 'sculptor, painter, architect and poet'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.deepEqual(res.payload, 'michelangelo')
    t.strictEqual(res.statusCode, 200)
  })
})

test('should fail immediately with invalid payload', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.post('/', { schema }, function (req, reply) {
    reply.code(200).send(req.body.name)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      hello: 'michelangelo'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.deepEqual(JSON.parse(res.payload), {
      statusCode: 400,
      error: 'Bad Request',
      message: "body should have required property 'name', body should have required property 'work'"
    })
    t.strictEqual(res.statusCode, 400)
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
    t.deepEqual(JSON.parse(res.payload), {
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: 'validation failed'
    })
    t.strictEqual(res.statusCode, 422)
  })
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

    t.deepEqual(JSON.parse(res.payload), [{
      keyword: 'required',
      dataPath: '',
      schemaPath: '#/required',
      params: { missingProperty: 'name' },
      message: 'should have required property \'name\''
    },
    {
      keyword: 'required',
      dataPath: '',
      schemaPath: '#/required',
      params: { missingProperty: 'work' },
      message: 'should have required property \'work\''
    }])
    t.strictEqual(res.statusCode, 400)
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
    t.deepEqual(JSON.parse(res.payload), {
      statusCode: 400,
      error: 'Bad Request',
      message: "body should have required property 'name', body should have required property 'work'"
    })
    t.strictEqual(res.statusCode, 400)
  })
})

test('Attached validation error should take precendence over setErrorHandler', t => {
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
    t.deepEqual(res.payload, "Attached: Error: body should have required property 'name', body should have required property 'work'")
    t.strictEqual(res.statusCode, 400)
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
    t.strictEqual(res.payload, '{"statusCode":500,"error":"Internal Server Error","message":"name is required!"}')
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
    t.strictEqual(res.payload, '{"statusCode":500,"error":"Internal Server Error","message":"name is required!"}')
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
    t.strictEqual(res.payload, `{"statusCode":400,"error":"Bad Request","message":"body should have required property 'name', body should have required property 'work'"}`)
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
    schemaCompiler: schema => data => Joi.validate(data, schema)
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
    t.strictEqual(res.payload, `{"statusCode":400,"error":"Bad Request","message":"child \\"name\\" fails because [\\"name\\" is required]"}`)
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
    schemaCompiler: schema => data => {
      const validation = Joi.validate(data, schema)
      return { error: validation.error.details }
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
    t.strictEqual(res.payload, `{"statusCode":400,"error":"Bad Request","message":"body \\"name\\" is required"}`)
  })
})
