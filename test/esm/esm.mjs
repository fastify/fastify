import t from 'tap'
import Fastify from '../../fastify.js'
import DefaultFastify, { fastify } from '../../fastify.mjs'

t.test('esm support from CJS module.exports', async t => {
  const app = Fastify()

  app.register(import('./plugin.mjs'), { foo: 'bar' })
  app.register(import('./other.mjs'))

  await app.ready()

  t.strictEqual(app.foo, 'bar')
})

t.test('esm default import', async t => {
  const app = DefaultFastify()

  await app.ready()

  t.pass()
})

t.test('esm named import', async t => {
  const app = fastify()

  await app.ready()

  t.pass()
})

t.only('CJS module.exports and esm default/named imports are the same object', t => {
  t.plan(2)

  t.is(DefaultFastify, fastify)
  t.is(DefaultFastify, Fastify)
})
