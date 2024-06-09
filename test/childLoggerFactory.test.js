'use strict'

const { test } = require('tap')
const Fastify = require('..')

test('Should accept a custom childLoggerFactory function', t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.setChildLoggerFactory(function (logger, bindings, opts) {
    t.ok(bindings.reqId)
    t.ok(opts)
    this.log.debug(bindings, 'created child logger')
    return logger.child(bindings, opts)
  })

  fastify.get('/', (req, reply) => {
    req.log.info('log message')
    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res) => {
      t.error(err)
      fastify.close()
    })
  })
})

test('req.log should be the instance returned by the factory', t => {
  t.plan(3)

  const fastify = Fastify()
  fastify.setChildLoggerFactory(function (logger, bindings, opts) {
    this.log.debug('using root logger')
    return this.log
  })

  fastify.get('/', (req, reply) => {
    t.equal(req.log, fastify.log)
    req.log.info('log message')
    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res) => {
      t.error(err)
      fastify.close()
    })
  })
})

test('should throw error if invalid logger is returned', t => {
  t.plan(2)

  const fastify = Fastify()
  fastify.setChildLoggerFactory(function () {
    this.log.debug('returning an invalid logger, expect error')
    return undefined
  })

  fastify.get('/', (req, reply) => {
    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.throws(() => {
      try {
        fastify.inject({
          method: 'GET',
          url: 'http://localhost:' + fastify.server.address().port
        }, (err) => {
          t.fail('request should have failed but did not')
          t.error(err)
          fastify.close()
        })
      } finally {
        fastify.close()
      }
    }, { code: 'FST_ERR_LOG_INVALID_LOGGER' })
  })
})
