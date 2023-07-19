const Fastify = require('../fastify')

const fastify = Fastify()

fastify.addHook('onListen', function () {
  console.log('****onListen Hook Activated****')
})

fastify.addHook('onListen', function () {
  console.log('****onListen Hook 2 Activated****')
})

// fastify.addHook('onReady', function () {
//   console.log('***onReady Hook 1 Acivated***')
// })

// fastify.addHook('onReady', function () {
//   console.log('***onReady Hook 2 Activated***')
// })

fastify.listen({
  host: 'localhost',
  port: 3000
})

setTimeout(() => {
  fastify.close()
}, 1000)

fastify.get('/', async function (request, reply) {
  reply.code(200).send({ data: 'home page' })
})

fastify.post('/post/:id', async function (request, reply) {
  const { id } = request.params
  reply.code(201).send({ data: `${id}` })
})

fastify.put('/put/:id', async function (request, reply) {
  const { id } = request.params
  reply.code(200).send({ data: `${id}` })
})

fastify.delete('/delete/:id', async function (request, reply) {
  const { id } = request.params
  reply.code(204).send({ data: `${id}` })
})
