'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('..')

test('nullable string', t => {
  t.plan(3)
  const fastify = Fastify()
  fastify.route({
    method: 'POST',
    url: '/',
    handler: (req, reply) => {
      t.same(req.body.hello, null)
      reply.code(200).send(req.body)
    },
    schema: {
      body: {
        type: 'object',
        properties: {
          hello: {
            type: 'string',
            format: 'email',
            nullable: true
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            hello: {
              type: 'string',
              format: 'email',
              nullable: true
            }
          }
        }
      }
    }
  })
  fastify.inject({
    method: 'POST',
    url: '/',
    body: {
      hello: null
    }
  }, (err, res) => {
    t.error(err)
    t.same(res.payload.hello, null)
  })
})

test('object or null body', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.route({
    method: 'POST',
    url: '/',
    handler: (req, reply) => {
      t.equal(req.body, undefined)
      reply.code(200).send({ isUndefinedBody: req.body === undefined })
    },
    schema: {
      body: {
        type: ['object', 'null'],
        properties: {
          hello: {
            type: 'string',
            format: 'email'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          nullable: true,
          properties: {
            isUndefinedBody: {
              type: 'boolean'
            }
          }
        }
      }
    }
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), { isUndefinedBody: true })
    })
  })
})

test('nullable body', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.route({
    method: 'POST',
    url: '/',
    handler: (req, reply) => {
      t.equal(req.body, undefined)
      reply.code(200).send({ isUndefinedBody: req.body === undefined })
    },
    schema: {
      body: {
        type: 'object',
        nullable: true,
        properties: {
          hello: {
            type: 'string',
            format: 'email'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          nullable: true,
          properties: {
            isUndefinedBody: {
              type: 'boolean'
            }
          }
        }
      }
    }
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), { isUndefinedBody: true })
    })
  })
})

test('Nullable body with 204', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.route({
    method: 'POST',
    url: '/',
    handler: (req, reply) => {
      t.equal(req.body, undefined)
      reply.code(204).send()
    },
    schema: {
      body: {
        type: 'object',
        nullable: true,
        properties: {
          hello: {
            type: 'string',
            format: 'email'
          }
        }
      }
    }
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 204)
      t.equal(body.length, 0)
    })
  })
})
