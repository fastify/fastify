'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('..')

test('nullable string', (t, done) => {
  t.plan(3)
  const fastify = Fastify()
  fastify.route({
    method: 'POST',
    url: '/',
    handler: (req, reply) => {
      t.assert.strictEqual(req.body.hello, null)
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
    t.assert.ifError(err)
    t.assert.strictEqual(res.json().hello, null)
    done()
  })
})

test('object or null body', (t, done) => {
  t.plan(5)

  const fastify = Fastify()

  fastify.route({
    method: 'POST',
    url: '/',
    handler: (req, reply) => {
      t.assert.strictEqual(req.body, undefined)
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
    t.assert.ifError(err)
    t.after(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(JSON.parse(body), { isUndefinedBody: true })
      done()
    })
  })
})

test('nullable body', (t, done) => {
  t.plan(5)

  const fastify = Fastify()

  fastify.route({
    method: 'POST',
    url: '/',
    handler: (req, reply) => {
      t.assert.strictEqual(req.body, undefined)
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
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(JSON.parse(body), { isUndefinedBody: true })
      done()
    })
  })
})

test('Nullable body with 204', (t, done) => {
  t.plan(5)

  const fastify = Fastify()

  fastify.route({
    method: 'POST',
    url: '/',
    handler: (req, reply) => {
      t.assert.strictEqual(req.body, undefined)
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
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 204)
      t.assert.strictEqual(body.length, 0)
      done()
    })
  })
})
