const fastify = require('../fastify')()

const fp = require('fastify-plugin')

const plugin = async (fastify) => {
  return fastify
    .decorateReply('test', () => {})
    .register(async fastify => {
      fastify.get('/test', async (req, reply) => {

      })
    })
}

plugin[Symbol.for('skip-override')] = true

fastify.register(plugin)

fastify.register(async (fastify) => {
  fastify.get('/', async (req, reply) => {
    reply.test()

    return { hello: 'world' }
  })
})

fastify.listen({
  port: 3000
})
