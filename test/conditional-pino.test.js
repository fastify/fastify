'use strict'

const t = require('node:test')
const test = t.test

test("pino is not require'd if logger is not passed", t => {
  t.plan(1)

  const fastify = require('..')

  fastify()

  t.assert.equal(!!require.cache[require.resolve('pino')], false)
})

test("pino is require'd if logger is passed", t => {
  t.plan(1)

  const fastify = require('..')

  fastify({
    logger: true
  })

  t.assert.equal(!!require.cache[require.resolve('pino')], true)
})

test("pino is require'd if loggerInstance is passed", t => {
  t.plan(1)

  const fastify = require('..')

  const loggerInstance = {
    fatal: (msg) => { },
    error: (msg) => { },
    warn: (msg) => { },
    info: (msg) => { },
    debug: (msg) => { },
    trace: (msg) => { },
    child: () => loggerInstance
  }

  fastify({
    loggerInstance
  })

  t.assert.equal(!!require.cache[require.resolve('pino')], true)
})
