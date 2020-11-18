'use strict'

module.exports = function (fastify, opts, next) {
  fastify
    .get('/', opts, function (req, reply) {
      reply.send({ hello: 'world' })
    })
    .post('/', opts, function (req, reply) {
      reply.send({ hello: 'world' })
    })
  next()
}
