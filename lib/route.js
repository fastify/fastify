// @ts-check

'use strict'

const FindMyWay = require('find-my-way')
const Context = require('./context')
const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
const validation = require('./validation')
const buildSchema = validation.build
const { buildSchemaCompiler } = validation
const { beforeHandlerWarning } = require('./warnings')

const {
  kState,
  kRoutePrefix,
  kLogLevel,
  kHooks,
  kSchemas,
  kSchemaCompiler,
  kContentTypeParser,
  kReply,
  kRequest,
  kMiddlewares,
  kGlobalHooks
} = require('./symbols.js')

module.exports = function buildRouting (options) {
  const router = FindMyWay(options.config)

  const schemaCache = new Map()
  schemaCache.put = schemaCache.set

  let routeHandler
  let avvio
  let buildMiddie
  let fourOhFour

  return {
    fill (args) {
      routeHandler = args.routeHandler
      avvio = args.avvio
      buildMiddie = args.buildMiddie
      fourOhFour = args.fourOhFour
    },
    router: router,
    routing: router.lookup.bind(router),
    route,
    printRoutes: router.prettyPrint.bind(router)
  }

  // Route management
  function route (opts) {
    throwIfAlreadyStarted.call(this, 'Cannot add route when fastify instance is already started!')

    if (Array.isArray(opts.method)) {
      for (var i = 0; i < opts.method.length; i++) {
        if (supportedMethods.indexOf(opts.method[i]) === -1) {
          throw new Error(`${opts.method[i]} method is not supported!`)
        }
      }
    } else {
      if (supportedMethods.indexOf(opts.method) === -1) {
        throw new Error(`${opts.method} method is not supported!`)
      }
    }

    if (!opts.handler) {
      throw new Error(`Missing handler function for ${opts.method}:${opts.url} route.`)
    }

    validateBodyLimitOption(opts.bodyLimit)

    const prefix = this[kRoutePrefix]

    this.after((notHandledErr, done) => {
      var path = opts.url || opts.path
      if (path === '/' && prefix.length > 0) {
        switch (opts.prefixTrailingSlash) {
          case 'slash':
            afterRouteAdded.call(this, path, notHandledErr, done)
            break
          case 'no-slash':
            afterRouteAdded.call(this, '', notHandledErr, done)
            break
          case 'both':
          default:
            afterRouteAdded.call(this, '', notHandledErr, done)
            afterRouteAdded.call(this, path, notHandledErr, done)
        }
      } else if (path[0] === '/' && prefix.endsWith('/')) {
        // Ensure that '/prefix/' + '/route' gets registered as '/prefix/route'
        afterRouteAdded.call(this, path.slice(1), notHandledErr, done)
      } else {
        afterRouteAdded.call(this, path, notHandledErr, done)
      }
    })

    // chainable api
    return this

    function afterRouteAdded (path, notHandledErr, done) {
      const url = prefix + path

      opts.url = url
      opts.path = url
      opts.prefix = prefix
      opts.logLevel = opts.logLevel || this[kLogLevel]

      if (opts.attachValidation == null) {
        opts.attachValidation = false
      }

      // run 'onRoute' hooks
      for (const hook of this[kGlobalHooks].onRoute) hook.call(this, opts)

      const config = opts.config || {}
      config.url = url

      const context = new Context(
        opts.schema,
        opts.handler.bind(this),
        this[kReply],
        this[kRequest],
        this[kContentTypeParser],
        config,
        this._errorHandler,
        opts.bodyLimit,
        opts.logLevel,
        opts.attachValidation
      )

      // TODO this needs to be refactored so that buildSchemaCompiler is
      // not called for every single route. Creating a new one for every route
      // is going to be very expensive.
      if (opts.schema) {
        try {
          if (opts.schemaCompiler == null && this[kSchemaCompiler] == null) {
            const externalSchemas = this[kSchemas].getJsonSchemas({ onlyAbsoluteUri: true })
            this.setSchemaCompiler(buildSchemaCompiler(externalSchemas, schemaCache))
          }

          buildSchema(context, opts.schemaCompiler || this[kSchemaCompiler], this[kSchemas])
        } catch (error) {
          done(error)
          return
        }
      }

      if (opts.preHandler == null && opts.beforeHandler != null) {
        beforeHandlerWarning()
        opts.preHandler = opts.beforeHandler
      }

      const hooks = ['preParsing', 'preValidation', 'onRequest', 'preHandler', 'preSerialization']

      for (let hook of hooks) {
        if (opts[hook]) {
          if (Array.isArray(opts[hook])) {
            opts[hook] = opts[hook].map(fn => fn.bind(this))
          } else {
            opts[hook] = opts[hook].bind(this)
          }
        }
      }

      try {
        router.on(opts.method, url, { version: opts.version }, routeHandler, context)
      } catch (err) {
        done(err)
        return
      }

      // It can happen that a user register a plugin with some hooks/middlewares *after*
      // the route registration. To be sure to load also that hooks/middlewares,
      // we must listen for the avvio's preReady event, and update the context object accordingly.
      avvio.once('preReady', () => {
        const onResponse = this[kHooks].onResponse
        const onSend = this[kHooks].onSend
        const onError = this[kHooks].onError

        context.onSend = onSend.length ? onSend : null
        context.onError = onError.length ? onError : null
        context.onResponse = onResponse.length ? onResponse : null

        for (let hook of hooks) {
          const toSet = this[kHooks][hook].concat(opts[hook] || [])
          context[hook] = toSet.length ? toSet : null
        }

        context._middie = buildMiddie(this[kMiddlewares])

        // Must store the 404 Context in 'preReady' because it is only guaranteed to
        // be available after all of the plugins and routes have been loaded.
        fourOhFour.setContext(this, context)
      })

      done(notHandledErr)
    }
  }

  function throwIfAlreadyStarted (msg) {
    if (this[kState].started) throw new Error(msg)
  }
}

// TODO replicated
function validateBodyLimitOption (bodyLimit) {
  if (bodyLimit === undefined) return
  if (!Number.isInteger(bodyLimit) || bodyLimit <= 0) {
    throw new TypeError(`'bodyLimit' option must be an integer > 0. Got '${bodyLimit}'`)
  }
}
