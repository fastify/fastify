const fp = require('fastify-plugin')
const fastify = require('../../../../')({
  logger: true
})

fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

fastify.register(fp((instance, opts, done) => {
  done()
}, { fastify: '9.x' }))

module.exports = fastify
