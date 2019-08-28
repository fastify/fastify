'use strict'

const FindMyWay = require('find-my-way')

const Reply = require('./reply')
const Request = require('./request')
const Context = require('./context')
const {
  kRoutePrefix,
  kCanSetNotFoundHandler,
  kFourOhFourLevelInstance,
  kReply,
  kRequest,
  kContentTypeParser,
  kBodyLimit,
  kLogLevel,
  kFourOhFourContext,
  kMiddlewares,
  kHooks
} = require('./symbols.js')
const { beforeHandlerWarning } = require('./warnings')
const { buildMiddie } = require('./middleware')

/**
 * Each fastify instance have a:
 * kFourOhFourLevelInstance: point to a fastify instance that has the 404 handler setted
 * kCanSetNotFoundHandler: bool to track if the 404 handler has alredy been set
 * kFourOhFour: the singleton instance of this 404 module
 * kFourOhFourContext: the context in the reply object where the handler will be executed
 */
function fourOhFour (options) {
  const { logger, modifyCoreObjects, genReqId } = options

  // 404 router, used for handling encapsulated 404 handlers
  const router = FindMyWay({ defaultRoute: fourOhFourFallBack })

  return { router, setNotFoundHandler, setContext, arrange404 }

  function arrange404 (instance) {
    // Change the pointer of the fastify instance to itself, so register + prefix can add new 404 handler
    instance[kFourOhFourLevelInstance] = instance
    instance[kCanSetNotFoundHandler] = true
  }

  function basic404 (request, reply) {
    const { url, method } = request.raw
    const message = `Route ${method}:${url} not found`
    request.log.info(message)
    reply.code(404).send({
      message,
      error: 'Not Found',
      statusCode: 404
    })
  }

  function setContext (instance, context) {
    const _404Context = Object.assign({}, instance[kFourOhFourContext])
    _404Context.onSend = context.onSend
    context[kFourOhFourContext] = _404Context
  }

  function setNotFoundHandler (opts, handler, avvio, routeHandler) {
    // First initialization of the fastify root instance
    if (this[kCanSetNotFoundHandler] === undefined) {
      this[kCanSetNotFoundHandler] = true
    }
    if (this[kFourOhFourContext] === undefined) {
      this[kFourOhFourContext] = null
    }

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
      _setNotFoundHandler.call(this, prefix, opts, handler, avvio, routeHandler)
      done(notHandledErr)
    })
  }

  function _setNotFoundHandler (prefix, opts, handler, avvio, routeHandler) {
    const context = new Context(
      opts.schema,
      handler,
      this[kReply],
      this[kRequest],
      this[kContentTypeParser],
      opts.config || {},
      this._errorHandler,
      this[kBodyLimit],
      this[kLogLevel]
    )

    avvio.once('preReady', () => {
      const context = this[kFourOhFourContext]

      const onRequest = this[kHooks].onRequest
      const preParsing = this[kHooks].preParsing.concat(opts.preParsing || [])
      const preValidation = this[kHooks].preValidation.concat(opts.preValidation || [])
      const preSerialization = this[kHooks].preSerialization.concat(opts.preSerialization || [])
      const preHandler = this[kHooks].preHandler.concat(opts.beforeHandler || opts.preHandler || [])
      const onSend = this[kHooks].onSend
      const onError = this[kHooks].onError
      const onResponse = this[kHooks].onResponse

      context.onRequest = onRequest.length ? onRequest : null
      context.preParsing = preParsing.length ? preParsing : null
      context.preValidation = preValidation.length ? preValidation : null
      context.preSerialization = preSerialization.length ? preSerialization : null
      context.preHandler = preHandler.length ? preHandler : null
      context.onSend = onSend.length ? onSend : null
      context.onError = onError.length ? onError : null
      context.onResponse = onResponse.length ? onResponse : null

      context._middie = buildMiddie(this[kMiddlewares])
    })

    if (this[kFourOhFourContext] !== null && prefix === '/') {
      Object.assign(this[kFourOhFourContext], context) // Replace the default 404 handler
      return
    }

    this[kFourOhFourLevelInstance][kFourOhFourContext] = context

    router.all(prefix + (prefix.endsWith('/') ? '*' : '/*'), routeHandler, context)
    router.all(prefix || '/', routeHandler, context)
  }

  function fourOhFourFallBack (req, res) {
    // if this happen, we have a very bad bug
    // we might want to do some hard debugging
    // here, let's print out as much info as
    // we can
    req.id = genReqId(req)
    req.originalUrl = req.url
    var childLogger = logger.child({ reqId: req.id })
    if (modifyCoreObjects) {
      req.log = res.log = childLogger
    }

    childLogger.info({ req }, 'incoming request')

    var request = new Request(null, req, null, req.headers, childLogger)
    var reply = new Reply(res, { onSend: [], onError: [] }, request, childLogger)

    request.log.warn('the default handler for 404 did not catch this, this is likely a fastify bug, please report it')
    request.log.warn(router.prettyPrint())
    reply.code(404).send(new Error('Not Found'))
  }
}

module.exports = fourOhFour
