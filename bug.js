const Fastify = require('.')
const fastify = Fastify({ logger: true })
const { setTimeout: sleep } = require('timers/promises')

fastify.get('/', async (request, reply) => {
  await sleep(100)
  setImmediate(() => {
    reply.send('something')
  })
})

fastify.listen({ port: 3000 })
