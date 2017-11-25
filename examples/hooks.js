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
  .addHook('onRequest', (req, res, next) => {
    console.log('onRequest')
    next()
  })
  .addHook('preHandler', (request, reply, next) => {
    console.log('preHandler')
    next()
  })
  .addHook('onSend', (request, reply, payload, next) => {
    console.log('onSend')
    next()
  })
  .addHook('onResponse', (res, next) => {
    console.log('onResponse')
    next()
  })

fastify.get('/', opts, (req, reply) => {
  reply.send({ hello: 'world' })
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
