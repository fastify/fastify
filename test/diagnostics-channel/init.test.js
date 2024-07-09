'use strict'

const t = require('tap')
const test = t.test
const proxyquire = require('proxyquire')

test('diagnostics_channel when present and subscribers', t => {
  t.plan(3)

  let fastifyInHook

  const diagnostics = {
    channel (name) {
      t.equal(name, 'fastify.initialization')
      return {
        hasSubscribers: true,
        publish (event) {
          t.ok(event.fastify)
          fastifyInHook = event.fastify
        }
      }
    },
    '@noCallThru': true
  }

  const fastify = proxyquire('../../fastify', {
    'node:diagnostics_channel': diagnostics
  })()
  t.equal(fastifyInHook, fastify)
})

test('diagnostics_channel when present and no subscribers', t => {
  t.plan(1)

  const diagnostics = {
    channel (name) {
      t.equal(name, 'fastify.initialization')
      return {
        hasSubscribers: false,
        publish () {
          t.fail('publish should not be called')
        }
      }
    },
    '@noCallThru': true
  }

  proxyquire('../../fastify', {
    'node:diagnostics_channel': diagnostics
  })()
})
