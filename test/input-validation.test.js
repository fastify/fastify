'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('case insensitive header validation', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.code(200).send(req.headers.foobar)
    },
    schema: {
      headers: {
        type: 'object',
        required: ['FooBar'],
        properties: {
          FooBar: { type: 'string' }
        }
      }
    }
  })
  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      FooBar: 'Baz'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, 'Baz')
  })
})

test('not evaluate json-schema $schema keyword', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.route({
    method: 'POST',
    url: '/',
    handler: (req, reply) => {
      reply.code(200).send(req.body.hello)
    },
    schema: {
      body: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      }
    }
  })
  fastify.inject({
    method: 'POST',
    url: '/',
    body: {
      hello: 'world'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, 'world')
  })
})

test('validation context in validation result', t => {
  t.plan(3)
  const fastify = Fastify()
  // custom error handler to expose validation context in response, so we can test it later
  fastify.setErrorHandler((err, request, reply) => {
    t.equal(err instanceof Error, true)
    t.equal(err.validationContext, 'body')
    reply.send()
  })
  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.code(200).send(req.body.hello)
    },
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  })
  fastify.inject({
    method: 'GET',
    url: '/',
    // body lacks required field, will fail validation
    body: {}
  }, (err, res) => {
    t.error(err)
  })
})
