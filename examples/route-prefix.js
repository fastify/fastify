'use strict'

const fastify = require('../fastify')({ loggerInstance: true })

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

fastify.register(function(instance, options) {
  // the route will be '/english/hello'
  instance.get('/hello', opts, (req, reply) => {
    reply.send({ greet: 'hello' })
  })
  return;;
}, { prefix: '/english' })

fastify.register(function(instance, options) {
  // the route will be '/italian/hello'
  instance.get('/hello', opts, (req, reply) => {
    reply.send({ greet: 'ciao' })
  })
  return;;
}, { prefix: '/italian' })

fastify.listen(8000, function (err) {
  if (err) {
    throw err
  }
})
