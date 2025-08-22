'use strict'

const { test } = require('node:test')
const { S } = require('fluent-json-schema')
const Fastify = require('..')

const BadRequestSchema = S.object()
  .prop('statusCode', S.number())
  .prop('error', S.string())
  .prop('message', S.string())

const InternalServerErrorSchema = S.object()
  .prop('statusCode', S.number())
  .prop('error', S.string())
  .prop('message', S.string())

const NotFoundSchema = S.object()
  .prop('statusCode', S.number())
  .prop('error', S.string())
  .prop('message', S.string())

const options = {
  schema: {
    body: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      400: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: BadRequestSchema.valueOf()
          }
        }
      },
      404: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: NotFoundSchema.valueOf(),
            example: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Not Found'
            }
          }
        }
      },
      500: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: InternalServerErrorSchema.valueOf(),
            example: {
              message: 'Internal Server Error'
            }
          }
        }
      }
    }
  }
}

const handler = (request, reply) => {
  if (request.body.id === '400') {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Custom message',
      extra: 'This should not be in the response'
    })
  }

  if (request.body.id === '404') {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'Custom Not Found',
      extra: 'This should not be in the response'
    })
  }

  if (request.body.id === '500') {
    reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Custom Internal Server Error',
      extra: 'This should not be in the response'
    })
  }

  reply.send({
    id: request.body.id,
    extra: 'This should not be in the response'
  })
}

test('serialize the response for a Bad Request error, as defined on the schema', async t => {
  const fastify = Fastify({})

  t.after(() => fastify.close())

  fastify.post('/', options, handler)

  const fastifyServer = await fastify.listen({ port: 0 })

  const result = await fetch(fastifyServer, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: '12'
  })

  t.assert.ok(!result.ok)
  t.assert.strictEqual(result.status, 400)
  t.assert.deepStrictEqual(await result.json(), {
    statusCode: 400,
    error: 'Bad Request',
    message: 'body must be object'
  })
})

// test('serialize the response for a Not Found error, as defined on the schema', t => {
//   const fastify = Fastify({})

//   t.teardown(fastify.close.bind(fastify))

//   fastify.post('/', options, handler)

//   fastify.listen({ port: 0 }, err => {
//     t.error(err)

//     const url = `http://localhost:${fastify.server.address().port}/`

//     sget({
//       method: 'POST',
//       url,
//       json: true,
//       body: { id: '404' }
//     }, (err, response, body) => {
//       t.error(err)
//       t.equal(response.statusCode, 404)
//       t.same(body, {
//         statusCode: 404,
//         error: 'Not Found',
//         message: 'Custom Not Found'
//       })
//       t.end()
//     })
//   })
// })

// test('serialize the response for a Internal Server Error error, as defined on the schema', t => {
//   const fastify = Fastify({})

//   t.teardown(fastify.close.bind(fastify))

//   fastify.post('/', options, handler)

//   fastify.listen({ port: 0 }, err => {
//     t.error(err)

//     const url = `http://localhost:${fastify.server.address().port}/`

//     sget({
//       method: 'POST',
//       url,
//       json: true,
//       body: { id: '500' }
//     }, (err, response, body) => {
//       t.error(err)
//       t.equal(response.statusCode, 500)
//       t.same(body, {
//         statusCode: 500,
//         error: 'Internal Server Error',
//         message: 'Custom Internal Server Error'
//       })
//       t.end()
//     })
//   })
// })

// test('serialize the success response, as defined on the schema', t => {
//   const fastify = Fastify({})

//   t.teardown(fastify.close.bind(fastify))

//   fastify.post('/', options, handler)

//   fastify.listen({ port: 0 }, err => {
//     t.error(err)

//     const url = `http://localhost:${fastify.server.address().port}/`

//     sget({
//       method: 'POST',
//       url,
//       json: true,
//       body: { id: 'test' }
//     }, (err, response, body) => {
//       t.error(err)
//       t.equal(response.statusCode, 200)
//       t.same(body, {
//         id: 'test'
//       })
//       t.end()
//     })
//   })
// })
