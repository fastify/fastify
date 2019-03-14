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

const optsPost = {
  schema: {
    body: {
      type: 'object',
      required: ['hello'],
      properties: {
        hello: {
          type: 'string'
        }
      }
    },
    response: opts.response
  }
}

fastify
  .addHook('onRequest', function (request, reply, next) {
    console.log('onRequest')
    next()
  })
  .addHook('preParsing', function (request, reply, next) {
    console.log('preParsing')
    next()
  })
  .addHook('preValidation', function (request, reply, next) {
    console.log('preValidation')
    next()
  })
  .addHook('preHandler', function (request, reply, next) {
    console.log('preHandler')
    next()
  })
  .addHook('preSerialization', function (request, reply, payload, next) {
    console.log('preSerialization', payload)
    next()
  })
  .addHook('onError', function (request, reply, error, next) {
    console.log('onError', error.message)
    next()
  })
  .addHook('onSend', function (request, reply, payload, next) {
    console.log('onSend', payload)
    next()
  })
  .addHook('onResponse', function (request, reply, next) {
    console.log('onResponse')
    next()
  })
  .addHook('onRoute', function (routeOptions) {
    console.log('onRoute')
  })
  .addHook('onClose', function (instance, done) {
    console.log('onClose')
    done()
  })

fastify.get('/', opts, function (req, reply) {
  reply.send({ hello: 'world' })
})

fastify.post('/', optsPost, function (req, reply) {
  reply.send({ hello: 'world' })
})

fastify.listen(3000, function (err) {
  if (err) {
    throw err
  }
  console.log(`server listening on ${fastify.server.address().port}`)
})
