const Fastify = require('fastify')
const t = require('tap')

t.test('printRoutes with commonPrefix: false returns raw routes', async t => {
  const fastify = Fastify()

  fastify.get('/user/profile', () => {})
  fastify.get('/user/settings', () => {})

  await fastify.ready()

  const output = fastify.printRoutes({ commonPrefix: false })
  t.match(output, '/user/profile')
  t.match(output, '/user/settings')
})
