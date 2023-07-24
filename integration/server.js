const Fastify = require('../fastify')

const fastify = Fastify()

fastify.addHook('onReady', function () {
  console.log('im ready')
})

fastify.addHook('onListen', function () {
  console.log('im listening')
})

fastify.listen({
  host: '::',
  port: 0
})

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
