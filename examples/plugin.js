'use strict'

module.exports = (fastify, opts, next) => {
  fastify
    .get('/', opts, (req, reply) => {
      reply.send({ hello: 'world' })
    })
    .post('/', opts, (req, reply) => {
      reply.send({ hello: 'world' })
    })
  next()
}
