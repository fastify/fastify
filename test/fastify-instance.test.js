'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const {
  kOptions
} = require('../lib/symbols')

test('root fastify instance is an object', t => {
  t.plan(1)
  t.type(Fastify(), 'object')
})

test('fastify instance should contains ajv options', t => {
  t.plan(1)
  const fastify = Fastify({
    ajv: {
      customOptions: {
        nullable: false
      }
    }
  })
  t.same(fastify[kOptions].ajv, {
    customOptions: {
      nullable: false
    },
    plugins: []
  })
})

test('fastify instance get invalid ajv options', t => {
  t.plan(1)
  t.throw(() => Fastify({
    ajv: {
      customOptions: 8
    }
  }))
})
