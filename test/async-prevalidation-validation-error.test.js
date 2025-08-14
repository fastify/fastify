'use strict'

const { test } = require('node:test')
const Fastify = require('..')

/**
 * Regression test for https://github.com/fastify/fastify/issues/6214
 * Ensure that synchronous errors thrown by a custom validator inside
 * an async `preValidation` lifecycle hook are properly forwarded to
 * the Fastify error handler instead of bubbling up as unhandled
 * promise rejections.
 */

test('thrown validation error inside async preValidation reaches error handler', async t => {
  t.plan(2)

  const fastify = Fastify()

  // Custom compiler that always throws to simulate a validation failure
  fastify.setValidatorCompiler(() => {
    return function () {
      throw new Error('kaboom')
    }
  })

  // Async preValidation hook (no done callback)
  fastify.addHook('preValidation', async () => {
    // do nothing – the presence of an async hook is enough to reproduce the bug
  })

  // Error handler that should be invoked when validation fails
  fastify.setErrorHandler((err, _request, reply) => {
    reply.code(400).send({ message: err.message })
  })

  // Simple route with params schema so the custom validator is triggered
  fastify.get('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, () => {
    // We should never reach the handler due to validation failure
  })

  const res = await fastify.inject({ method: 'GET', url: '/123' })

  t.assert.strictEqual(res.statusCode, 400)
  t.assert.deepStrictEqual(JSON.parse(res.payload), { message: 'kaboom' })
})

test('validation error with attachValidation after async preValidation', async t => {
  t.plan(2)

  const fastify = Fastify()

  // Custom compiler that always throws to simulate a validation failure
  fastify.setValidatorCompiler(() => {
    return function () {
      throw new Error('validation failed')
    }
  })

  // Async preValidation hook (no done callback)
  fastify.addHook('preValidation', async () => {
    // do nothing – the presence of an async hook is enough to reproduce the scenario
  })

  // Route with attachValidation enabled
  fastify.get('/:id', {
    attachValidation: true,
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, (request, reply) => {
    // When attachValidation is true, validation errors should be attached to request
    if (request.validationError) {
      reply.code(422).send({
        error: 'Custom validation error handling',
        message: request.validationError.message
      })
    } else {
      reply.send({ id: request.params.id })
    }
  })

  const res = await fastify.inject({ method: 'GET', url: '/123' })

  t.assert.strictEqual(res.statusCode, 422)
  t.assert.deepStrictEqual(JSON.parse(res.payload), {
    error: 'Custom validation error handling',
    message: 'validation failed'
  })
})

test('synchronous error in preValidation hook should be caught and handled', async t => {
  t.plan(2)

  const fastify = Fastify()

  // Sync preValidation hook that throws synchronously
  fastify.addHook('preValidation', (request, reply, done) => {
    throw new Error('sync preValidation error')
  })

  // Error handler that should be invoked when preValidation fails
  fastify.setErrorHandler((err, _request, reply) => {
    reply.code(500).send({ message: err.message })
  })

  // Simple route
  fastify.get('/', () => {
    // We should never reach the handler due to preValidation failure
  })

  const res = await fastify.inject({ method: 'GET', url: '/' })

  t.assert.strictEqual(res.statusCode, 500)
  t.assert.deepStrictEqual(JSON.parse(res.payload), { message: 'sync preValidation error' })
})
