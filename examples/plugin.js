'use strict'

module.exports = function (fastify, opts, next) {
  fastify
    .get('/', opts.schema, function (req, reply) {
      reply(null, { hello: 'world' })
    })
    .post('/', opts.schema, function (req, reply) {
      reply(null, { hello: 'world' })
    })
  next()
}
