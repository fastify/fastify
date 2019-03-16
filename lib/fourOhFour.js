'use strict'

const FindMyWay = require('find-my-way')

const {
  kRoutePrefix,
  kCanSetNotFoundHandler,
  kFourOhFourLevelInstance
  // kBodyLimit,
  // kRoutePrefix,
  // kLogLevel,
  // kHooks,
  // kContentTypeParser,
  // kReply,
  // kRequest,
  // kMiddlewares,
  // kCanSetNotFoundHandler,
  // kFourOhFourLevelInstance
  // kFourOhFourContext
} = require('./symbols.js')

function fourOhFour (fourOhFourFallBack) {
  // 404 router, used for handling encapsulated 404 handlers
  const router = FindMyWay({ defaultRoute: fourOhFourFallBack })

  const papi = {
    router,
    setNotFoundHandler: setNotFoundHandler
  }

  return papi

  function basic404 (req, reply) {
    reply.code(404).send(new Error('Not Found'))
  }

  function beforeHandlerWarning () {
    if (beforeHandlerWarning.called) return
    beforeHandlerWarning.called = true
    process.emitWarning('The route option `beforeHandler` has been deprecated, use `preHandler` instead')
  }

  function setNotFoundHandler (opts, handler, _setNotFoundHandler) {
    const _fastify = this
    const prefix = this[kRoutePrefix] || '/'

    if (this[kCanSetNotFoundHandler] === false) {
      throw new Error(`Not found handler already set for Fastify instance with prefix: '${prefix}'`)
    }

    if (typeof opts === 'object') {
      if (opts.preHandler == null && opts.beforeHandler != null) {
        beforeHandlerWarning()
        opts.preHandler = opts.beforeHandler
      }
      if (opts.preHandler) {
        if (Array.isArray(opts.preHandler)) {
          opts.preHandler = opts.preHandler.map(hook => hook.bind(_fastify))
        } else {
          opts.preHandler = opts.preHandler.bind(_fastify)
        }
      }

      if (opts.preValidation) {
        if (Array.isArray(opts.preValidation)) {
          opts.preValidation = opts.preValidation.map(hook => hook.bind(_fastify))
        } else {
          opts.preValidation = opts.preValidation.bind(_fastify)
        }
      }
    }

    if (typeof opts === 'function') {
      handler = opts
      opts = undefined
    }
    opts = opts || {}

    if (handler) {
      this[kFourOhFourLevelInstance][kCanSetNotFoundHandler] = false
      handler = handler.bind(this)
    } else {
      handler = basic404
    }

    this.after((notHandledErr, done) => {
      _setNotFoundHandler.call(this, prefix, opts, handler)
      done(notHandledErr)
    })
  }
}

module.exports = fourOhFour
