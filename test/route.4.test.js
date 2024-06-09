'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('route error handler overrides global custom error handler', t => {
  t.plan(4)

  const fastify = Fastify()

  const customGlobalErrorHandler = (error, request, reply) => {
    t.error(error)
    reply.code(429).send({ message: 'Too much coffee' })
  }

  const customRouteErrorHandler = (error, request, reply) => {
    t.equal(error.message, 'Wrong Pot Error')
    reply.code(418).send({
      message: 'Make a brew',
      statusCode: 418,
      error: 'Wrong Pot Error'
    })
  }

  fastify.setErrorHandler(customGlobalErrorHandler)

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, res) => {
      res.send(new Error('Wrong Pot Error'))
    },
    errorHandler: customRouteErrorHandler
  })

  fastify.inject({
    method: 'GET',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 418)
    t.same(JSON.parse(res.payload), {
      message: 'Make a brew',
      statusCode: 418,
      error: 'Wrong Pot Error'
    })
  })
})

test('throws when route with empty url', async t => {
  t.plan(1)

  const fastify = Fastify()
  try {
    fastify.route({
      method: 'GET',
      url: '',
      handler: (req, res) => {
        res.send('hi!')
      }
    })
  } catch (err) {
    t.equal(err.message, 'The path could not be empty')
  }
})

test('throws when route with empty url in shorthand declaration', async t => {
  t.plan(1)

  const fastify = Fastify()
  try {
    fastify.get(
      '',
      async function handler () { return {} }
    )
  } catch (err) {
    t.equal(err.message, 'The path could not be empty')
  }
})

test('throws when route-level error handler is not a function', t => {
  t.plan(1)

  const fastify = Fastify()

  try {
    fastify.route({
      method: 'GET',
      url: '/tea',
      handler: (req, res) => {
        res.send('hi!')
      },
      errorHandler: 'teapot'
    })
  } catch (err) {
    t.equal(err.message, 'Error Handler for GET:/tea route, if defined, must be a function')
  }
})

test('route child logger factory overrides default child logger factory', t => {
  t.plan(3)

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

  fastify.inject({
    method: 'GET',
    url: '/coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
})
