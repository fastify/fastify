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
  .addHook('preRouting', function (req, res, next) {
    console.log('preRouting')
    next()
  })
  .addHook('preHandler', function (request, reply, next) {
    console.log('preHandler')
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
