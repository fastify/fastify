'use strict'

module.exports = function (fastify, opts, next) {
  fastify
    .get('/', opts.schema, function (req, reply) {
      reply.send({ hello: 'world' })
    })
    .post('/', opts.schema, function (req, reply) {
      reply.send({ hello: 'world' })
    })
  next()
}
