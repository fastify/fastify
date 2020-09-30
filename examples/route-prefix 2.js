'use strict'

const fastify = require('../fastify')()

const opts = {
  schema: {
    response: {
      '2xx': {
        type: 'object',
        properties: {
          greet: { type: 'string' }
        }
      }
    }
  }
}

fastify.register(function (instance, options, next) {
  // the route will be '/english/hello'
  instance.get('/hello', opts, (req, reply) => {
    reply.send({ greet: 'hello' })
  })
  next()
}, { prefix: '/english' })

fastify.register(function (instance, options, next) {
  // the route will be '/italian/hello'
  instance.get('/hello', opts, (req, reply) => {
    reply.send({ greet: 'ciao' })
  })
  next()
}, { prefix: '/italian' })

fastify.listen(8000, function (err) {
  if (err) {
    throw err
  }
  console.log(`server listening on ${fastify.server.address().port}`)
})
