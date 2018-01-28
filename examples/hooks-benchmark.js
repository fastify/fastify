'use strict'

const fastify = require('../fastify')()

const opts = {
  schema: {
    response: {
      200: {
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

fastify
  .addHook('onRequest', function (req, res, next) {
    next()
  })
  .addHook('onRequest', function (req, res, next) {
    next()
  })

fastify
  .addHook('preHandler', function (request, reply, next) {
    next()
  })
  .addHook('preHandler', function (request, reply, next) {
    setImmediate(next)
  })
  .addHook('preHandler', function (request, reply, next) {
    next()
  })

fastify
  .addHook('onSend', function (request, reply, payload, next) {
    next()
  })

fastify.get('/', opts, function (request, reply) {
  reply.send({ hello: 'world' })
})

fastify.listen(3000, function (err) {
  if (err) {
    throw err
  }
  console.log(`server listening on ${fastify.server.address().port}`)
})
