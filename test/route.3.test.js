'use strict'

const t = require('tap')
const test = t.test
const joi = require('joi')
const Fastify = require('..')

test('does not mutate joi schemas', t => {
  t.plan(4)

  const fastify = Fastify()
  function validatorCompiler ({ schema, method, url, httpPart }) {
    // Needed to extract the params part,
    // without the JSON-schema encapsulation
    // that is automatically added by the short
    // form of params.
    schema = joi.object(schema.properties)

    return validateHttpData

    function validateHttpData (data) {
      return schema.validate(data)
    }
  }

  fastify.setValidatorCompiler(validatorCompiler)

  fastify.route({
    path: '/foo/:an_id',
    method: 'GET',
    schema: {
      params: { an_id: joi.number() }
    },
    handler (req, res) {
      t.same(req.params, { an_id: 42 })
      res.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/foo/42'
  }, (err, result) => {
    t.error(err)
    t.equal(result.statusCode, 200)
    t.same(JSON.parse(result.payload), { hello: 'world' })
  })
})

test('multiple routes with one schema', t => {
  t.plan(2)

  const fastify = Fastify()

  const schema = {
    query: {
      type: 'object',
      properties: {
        id: { type: 'number' }
      }
    }
  }

  fastify.route({
    schema,
    method: 'GET',
    path: '/first/:id',
    handler (req, res) {
      res.send({ hello: 'world' })
    }
  })

  fastify.route({
    schema,
    method: 'GET',
    path: '/second/:id',
    handler (req, res) {
      res.send({ hello: 'world' })
    }
  })

  fastify.ready(error => {
    t.error(error)
    t.same(schema, schema)
  })
})

test('route error handler overrides default error handler', t => {
  t.plan(4)

  const fastify = Fastify()

  const customRouteErrorHandler = (error, request, reply) => {
    t.equal(error.message, 'Wrong Pot Error')

    reply.code(418).send({
      message: 'Make a brew',
      statusCode: 418,
      error: 'Wrong Pot Error'
    })
  }

  fastify.route({
    method: 'GET',
    path: '/coffee',
    handler: (req, res) => {
      res.send(new Error('Wrong Pot Error'))
    },
    errorHandler: customRouteErrorHandler
  })

  fastify.inject({
    method: 'GET',
    url: '/coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 418)
    t.same(JSON.parse(res.payload), {
      message: 'Make a brew',
      statusCode: 418,
      error: 'Wrong Pot Error'
    })
  })
})

test('route error handler does not affect other routes', t => {
  t.plan(3)

  const fastify = Fastify()

  const customRouteErrorHandler = (error, request, reply) => {
    t.equal(error.message, 'Wrong Pot Error')

    reply.code(418).send({
      message: 'Make a brew',
      statusCode: 418,
      error: 'Wrong Pot Error'
    })
  }

  fastify.route({
    method: 'GET',
    path: '/coffee',
    handler: (req, res) => {
      res.send(new Error('Wrong Pot Error'))
    },
    errorHandler: customRouteErrorHandler
  })

  fastify.route({
    method: 'GET',
    path: '/tea',
    handler: (req, res) => {
      res.send(new Error('No tea today'))
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/tea'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 500)
    t.same(JSON.parse(res.payload), {
      message: 'No tea today',
      statusCode: 500,
      error: 'Internal Server Error'
    })
  })
})

test('async error handler for a route', t => {
  t.plan(4)

  const fastify = Fastify()

  const customRouteErrorHandler = async (error, request, reply) => {
    t.equal(error.message, 'Delayed Pot Error')
    reply.code(418)
    return {
      message: 'Make a brew sometime later',
      statusCode: 418,
      error: 'Delayed Pot Error'
    }
  }

  fastify.route({
    method: 'GET',
    path: '/late-coffee',
    handler: (req, res) => {
      res.send(new Error('Delayed Pot Error'))
    },
    errorHandler: customRouteErrorHandler
  })

  fastify.inject({
    method: 'GET',
    url: '/late-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 418)
    t.same(JSON.parse(res.payload), {
      message: 'Make a brew sometime later',
      statusCode: 418,
      error: 'Delayed Pot Error'
    })
  })
})
