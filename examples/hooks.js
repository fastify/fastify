'use strict'

const fastify = require('../fastify')()

const opts = {
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

fastify
  .addHook('onRequest', function (req, res, next) {
    console.log('onRequest')
    next()
  })
  .addHook('preHandler', function (request, reply, next) {
    console.log('preHandler')
    next()
  })
  .addHook('onSend', function (request, reply, ctx, next) {
    console.log('onSend')
    next()
  })
  .addHook('onResponse', function (res, next) {
    console.log('onResponse')
    next()
  })

fastify.get('/', opts, function (req, reply) {
  reply.send({ hello: 'world' })
})

fastify.listen(3000, function (err) {
  if (err) {
    throw err
  }
  console.log(`server listening on ${fastify.server.address().port}`)
})
