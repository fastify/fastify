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
  .addHook('onRequest', function (request, reply, done) {
    done()
  })
  .addHook('onRequest', function (request, reply, done) {
    done()
  })

fastify
  .addHook('preHandler', function (request, reply, done) {
    done()
  })
  .addHook('preHandler', function (request, reply, done) {
    setImmediate(done)
  })
  .addHook('preHandler', function (request, reply, done) {
    done()
  })

fastify
  .addHook('onSend', function (request, reply, payload, done) {
    done()
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
