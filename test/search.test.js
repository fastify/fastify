'use strict'

const t = require('tap')
const test = t.test
const fastify = require('..')()

const schema = {
  schema: {
    response: {
      '2xx': {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      }
    }
  }
}

const querySchema = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        hello: {
          type: 'integer'
        }
      }
    }
  }
}

const paramsSchema = {
  schema: {
    params: {
      type: 'object',
      properties: {
        foo: {
          type: 'string'
        },
        test: {
          type: 'integer'
        }
      }
    }
  }
}

test('shorthand - search', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'SEARCH',
      url: '/',
      schema,
      handler: function (request, reply) {
        reply.code(200).send({ hello: 'world' })
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - search params', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'SEARCH',
      url: '/params/:foo/:test',
      paramsSchema,
      handler: function (request, reply) {
        reply.code(200).send(request.params)
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - get, querystring schema', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'SEARCH',
      url: '/query',
      querySchema,
      handler: function (request, reply) {
        reply.code(200).send(request.query)
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})
