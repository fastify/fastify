'use strict'

import t from 'tap'
import Fastify from '../../fastify.js'

t.test('esm support', async t => {
  const fastify = Fastify()

  fastify.register(import('./plugin.mjs'), { foo: 'bar' })

  await fastify.ready()

  t.strictEqual(fastify.foo, 'bar')
})
