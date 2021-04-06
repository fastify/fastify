import t from 'tap'
import { fastify } from '../../fastify.js'

t.test('named exports support', async t => {
  const app = fastify()

  app.register(import('./plugin.mjs'), { foo: 'bar' })
  app.register(import('./other.mjs'))

  await app.ready()

  t.equal(app.foo, 'bar')
})
