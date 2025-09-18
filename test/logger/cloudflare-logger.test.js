'use strict'

const t = require('tap')
const Fastify = require('../..') // adjust path to main fastify entry
const pino = require('pino')

t.test('Fastify should not crash if pino.symbols is undefined (Cloudflare Workers)', async t => {
  t.plan(1)

  const oldSymbols = pino.symbols
  delete pino.symbols

  const app = Fastify()
  t.teardown(() => app.close())

  app.get('/', async () => 'ok')

  const res = await app.inject({ url: '/' })
  t.equal(res.statusCode, 200)

  // restore
  pino.symbols = oldSymbols
})
