'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('route child logger factory does not affect other routes', t => {
  t.plan(6)

  const fastify = Fastify()

  const customRouteChildLogger = (logger, bindings, opts, req) => {
    const child = logger.child(bindings, opts)
    child.customLog = function (message) {
      t.equal(message, 'custom')
    }
    return child
  }

  fastify.route({
    method: 'GET',
    path: '/coffee',
    handler: (req, res) => {
      req.log.customLog('custom')
      res.send()
    },
    childLoggerFactory: customRouteChildLogger
  })

  fastify.route({
    method: 'GET',
    path: '/tea',
    handler: (req, res) => {
      t.notMatch(req.log.customLog instanceof Function)
      res.send()
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
  fastify.inject({
    method: 'GET',
    url: '/tea'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
})
test('route child logger factory overrides global custom error handler', t => {
  t.plan(6)

  const fastify = Fastify()

  const customGlobalChildLogger = (logger, bindings, opts, req) => {
    const child = logger.child(bindings, opts)
    child.globalLog = function (message) {
      t.equal(message, 'global')
    }
    return child
  }
  const customRouteChildLogger = (logger, bindings, opts, req) => {
    const child = logger.child(bindings, opts)
    child.customLog = function (message) {
      t.equal(message, 'custom')
    }
    return child
  }

  fastify.setChildLoggerFactory(customGlobalChildLogger)

  fastify.route({
    method: 'GET',
    path: '/coffee',
    handler: (req, res) => {
      req.log.customLog('custom')
      res.send()
    },
    childLoggerFactory: customRouteChildLogger
  })
  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, res) => {
      req.log.globalLog('global')
      res.send()
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
  fastify.inject({
    method: 'GET',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
})

test('Creates a HEAD route for each GET one (default)', t => {
  t.plan(8)

  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, reply) => {
      reply.send({ here: 'is coffee' })
    }
  })

  fastify.route({
    method: 'GET',
    path: '/some-light',
    handler: (req, reply) => {
      reply.send('Get some light!')
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.same(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/some-light'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/plain; charset=utf-8')
    t.equal(res.body, '')
  })
})

test('Do not create a HEAD route for each GET one (exposeHeadRoutes: false)', t => {
  t.plan(4)

  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, reply) => {
      reply.send({ here: 'is coffee' })
    }
  })

  fastify.route({
    method: 'GET',
    path: '/some-light',
    handler: (req, reply) => {
      reply.send('Get some light!')
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })

  fastify.inject({
    method: 'HEAD',
    url: '/some-light'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })
})

test('Creates a HEAD route for each GET one', t => {
  t.plan(8)

  const fastify = Fastify({ exposeHeadRoutes: true })

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, reply) => {
      reply.send({ here: 'is coffee' })
    }
  })

  fastify.route({
    method: 'GET',
    path: '/some-light',
    handler: (req, reply) => {
      reply.send('Get some light!')
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.same(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/some-light'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/plain; charset=utf-8')
    t.equal(res.body, '')
  })
})
