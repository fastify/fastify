'use strict'

const { test } = require('tap')
const Fastify = require('..')
const {
  FSTDEP022
} = require('../lib/warnings')

test('use of deprecated json shorthand in params should warn', t => {
  t.plan(3)

  process.removeAllListeners('warning')
  process.on('warning', onWarning)
  function onWarning (warning) {
    t.equal(warning.name, 'DeprecationWarning')
    t.equal(warning.code, FSTDEP022.code)
  }

  const fastify = Fastify()

  fastify.get('/:id', {
    schema: {
      params: {
        id: { type: 'string' }
      }
    }
  }, (_, reply) => {
    return reply.code(200).send('')
  })

  fastify.inject({ method: 'GET', url: '/1' }, (err, res) => {
    t.error(err)

    process.removeListener('warning', onWarning)
  })

  FSTDEP022.emitted = false
})

test('use of deprecated json shorthand in headers should warn', t => {
  t.plan(3)

  process.removeAllListeners('warning')
  process.on('warning', onWarning)
  function onWarning (warning) {
    t.equal(warning.name, 'DeprecationWarning')
    t.equal(warning.code, FSTDEP022.code)
  }

  const fastify = Fastify()

  fastify.get('/', {
    schema: {
      headers: {
        hello: { type: 'string' }
      }
    }
  }, (_, reply) => {
    return reply.code(200).send('')
  })

  fastify.inject({ method: 'GET', url: '/' }, (err, res) => {
    t.error(err)

    process.removeListener('warning', onWarning)
  })

  FSTDEP022.emitted = false
})

test('use of deprecated json shorthand in querystring should warn', t => {
  t.plan(3)

  process.removeAllListeners('warning')
  process.on('warning', onWarning)
  function onWarning (warning) {
    t.equal(warning.name, 'DeprecationWarning')
    t.equal(warning.code, FSTDEP022.code)
  }

  const fastify = Fastify()

  fastify.get('/', {
    schema: {
      querystring: {
        hello: { type: 'string' }
      }
    }
  }, (_, reply) => {
    return reply.code(200).send('')
  })

  fastify.inject({ method: 'GET', url: '/', query: { hello: 'world' } }, (err, res) => {
    t.error(err)

    process.removeListener('warning', onWarning)
  })

  FSTDEP022.emitted = false
})

test('use of deprecated json shorthand in body should warn', t => {
  t.plan(3)

  process.removeAllListeners('warning')
  process.on('warning', onWarning)
  function onWarning (warning) {
    t.equal(warning.name, 'DeprecationWarning')
    t.equal(warning.code, FSTDEP022.code)
  }

  const fastify = Fastify()

  fastify.post('/', {
    schema: {
      body: {
        hello: { type: 'string' }
      }
    }
  }, (_, reply) => {
    return reply.code(200).send('')
  })

  fastify.inject({ method: 'POST', url: '/', body: { hello: 'world' } }, (err, res) => {
    t.error(err)

    process.removeListener('warning', onWarning)
  })

  FSTDEP022.emitted = false
})
