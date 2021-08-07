const fastify = require('../../../../')({
  logger: true
})
// Declare a route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

module.exports = fastify
