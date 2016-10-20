'use strict'

const schema = {
  out: {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    }
  }
}

module.exports = function (fastify, opts, next) {
  fastify
    .get('/', schema, function (req, reply) {
      reply(null, { hello: 'world' })
    })
    .post('/', schema, function (req, reply) {
      reply(null, { hello: 'world' })
    })
  next()
}
