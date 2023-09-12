'use strict'

const t = require('tap')
const test = t.test
const proxyquire = require('proxyquire')

test('diagnostics_channel when present and subscribers', t => {
  t.plan(3)

  let fastifyInHook

  const dc = {
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

  const fastify = proxyquire('../fastify', {
    'node:diagnostics_channel': dc
  })()
  t.equal(fastifyInHook, fastify)
})

test('diagnostics_channel when present and no subscribers', t => {
  t.plan(1)

  const dc = {
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

  proxyquire('../fastify', {
    'node:diagnostics_channel': dc
  })()
})

test('diagnostics_channel when not present', t => {
  t.plan(1)

  t.doesNotThrow(() => {
    proxyquire('../fastify', {
      'node:diagnostics_channel': null
    })()
  })
})
