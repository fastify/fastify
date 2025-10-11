'use strict'

const semver = require('semver')
const assert = require('node:assert')
const Avvio = require('avvio')
const {
  kAvvioBoot,
  kChildren,
  kRoutePrefix,
  kLogLevel,
  kLogSerializers,
  kHooks,
  kSchemaController,
  kContentTypeParser,
  kReply,
  kRequest,
  kFourOhFour,
  kPluginNameChain,
  kErrorHandlerAlreadySet,
  kTestInternals,
  kState,
  kKeepAliveConnections
} = require('./symbols.js')
const { exist, existReply, existRequest } = require('./decorate.js')
const {
  FST_ERR_PLUGIN_VERSION_MISMATCH,
  FST_ERR_PLUGIN_NOT_PRESENT_IN_INSTANCE,
  FST_ERR_PLUGIN_INVALID_ASYNC_HANDLER
} = require('./errors.js')
const Reply = require('./reply.js')
const Request = require('./request.js')
const SchemaController = require('./schema-controller.js')
const ContentTypeParser = require('./content-type-parser.js')
const { buildHooks, hookRunnerApplication } = require('./hooks.js')
const createReadyFunction = require('./ready.js')

const kRegisteredPlugins = Symbol.for('registered-plugin')

function setupAvvio ({
  fastify, options,
  forceCloseConnections,
  serverHasCloseAllConnections,
  serverHasCloseHttp2Sessions,
  defaultInitOptions,
  router
}
) {
  const avvioPluginTimeout = Number(options.pluginTimeout)
  const avvio = Avvio(fastify, {
    autostart: false,
    timeout: isNaN(avvioPluginTimeout) === false ? avvioPluginTimeout : defaultInitOptions.pluginTimeout,
    expose: {
      use: 'register'
    }
  })
  // Override to allow the plugin encapsulation
  avvio.override = override
  avvio.on('start', () => (fastify[kState].started = true))

  // cache the closing value, since we are checking it in an hot path
  avvio.once('preReady', () => {
    fastify.onClose((instance, done) => {
      fastify[kState].closing = true
      router.closeRoutes()

      hookRunnerApplication('preClose', fastify[kAvvioBoot], fastify, function () {
        if (fastify[kState].listening) {
          /* istanbul ignore next: Cannot test this without Node.js core support */
          if (forceCloseConnections === 'idle') {
            // Not needed in Node 19
            instance.server.closeIdleConnections()
            /* istanbul ignore next: Cannot test this without Node.js core support */
          } else if (serverHasCloseAllConnections && forceCloseConnections) {
            instance.server.closeAllConnections()
          } else if (forceCloseConnections === true) {
            for (const conn of fastify[kKeepAliveConnections]) {
              // We must invoke the destroy method instead of merely unreffing
              // the sockets. If we only unref, then the callback passed to
              // `fastify.close` will never be invoked; nor will any of the
              // registered `onClose` hooks.
              conn.destroy()
              fastify[kKeepAliveConnections].delete(conn)
            }
          }
        }

        if (serverHasCloseHttp2Sessions) {
          instance.server.closeHttp2Sessions()
        }

        // No new TCP connections are accepted.
        // We must call close on the server even if we are not listening
        // otherwise memory will be leaked.
        // https://github.com/nodejs/node/issues/48604
        if (!options.serverFactory || fastify[kState].listening) {
          instance.server.close(function (err) {
            /* c8 ignore next 6 */
            if (err && err.code !== 'ERR_SERVER_NOT_RUNNING') {
              done(null)
            } else {
              done()
            }
          })
        } else {
          process.nextTick(done, null)
        }
      })
    })
  })

  fastify[kAvvioBoot] = fastify.ready // the avvio ready function
  fastify.ready = createReadyFunction(fastify) // overwrite the avvio ready function
  fastify.printPlugins = avvio.prettyPrint.bind(avvio)

  return avvio
}

// Function that runs the encapsulation magic.
// Everything that need to be encapsulated must be handled in this function.
function override (old, fn, opts) {
  const shouldSkipOverride = registerPlugin.call(old, fn)

  const fnName = getPluginName(fn) || getFuncPreview(fn)
  if (shouldSkipOverride) {
    // after every plugin registration we will enter a new name
    old[kPluginNameChain].push(fnName)
    return old
  }

  const instance = Object.create(old)
  old[kChildren].push(instance)
  instance.ready = old[kAvvioBoot].bind(instance)
  instance[kChildren] = []

  instance[kReply] = Reply.buildReply(instance[kReply])
  instance[kRequest] = Request.buildRequest(instance[kRequest])

  instance[kContentTypeParser] = ContentTypeParser.helpers.buildContentTypeParser(instance[kContentTypeParser])
  instance[kHooks] = buildHooks(instance[kHooks])
  instance[kRoutePrefix] = buildRoutePrefix(instance[kRoutePrefix], opts.prefix)
  instance[kLogLevel] = opts.logLevel || instance[kLogLevel]
  instance[kSchemaController] = SchemaController.buildSchemaController(old[kSchemaController])
  instance.getSchema = instance[kSchemaController].getSchema.bind(instance[kSchemaController])
  instance.getSchemas = instance[kSchemaController].getSchemas.bind(instance[kSchemaController])

  // Track the registered and loaded plugins since the root instance.
  // It does not track the current encapsulated plugin.
  instance[kRegisteredPlugins] = Object.create(instance[kRegisteredPlugins])

  // Track the plugin chain since the root instance.
  // When an non-encapsulated plugin is added, the chain will be updated.
  instance[kPluginNameChain] = [fnName]
  instance[kErrorHandlerAlreadySet] = false

  if (instance[kLogSerializers] || opts.logSerializers) {
    instance[kLogSerializers] = Object.assign(Object.create(instance[kLogSerializers]), opts.logSerializers)
  }

  if (opts.prefix) {
    instance[kFourOhFour].arrange404(instance)
  }

  for (const hook of instance[kHooks].onRegister) hook.call(old, instance, opts)

  return instance
}

function buildRoutePrefix (instancePrefix, pluginPrefix) {
  if (!pluginPrefix) {
    return instancePrefix
  }

  // Ensure that there is a '/' between the prefixes
  if (instancePrefix.endsWith('/') && pluginPrefix[0] === '/') {
    // Remove the extra '/' to avoid: '/first//second'
    pluginPrefix = pluginPrefix.slice(1)
  } else if (pluginPrefix[0] !== '/') {
    pluginPrefix = '/' + pluginPrefix
  }

  return instancePrefix + pluginPrefix
}

const rcRegex = /-(?:rc|pre|alpha).+$/u

function getMeta (fn) {
  return fn[Symbol.for('plugin-meta')]
}

function getPluginName (func) {
  const display = getDisplayName(func)
  if (display) {
    return display
  }

  // let's see if this is a file, and in that case use that
  // this is common for plugins
  const cache = require.cache
  // cache is undefined inside SEA
  if (cache) {
    const keys = Object.keys(cache)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (cache[key].exports === func) {
        return key
      }
    }
  }

  // if not maybe it's a named function, so use that
  if (func.name) {
    return func.name
  }

  return null
}

function getFuncPreview (func) {
  // takes the first two lines of the function if nothing else works
  return func.toString().split('\n', 2).map(s => s.trim()).join(' -- ')
}

function getDisplayName (fn) {
  return fn[Symbol.for('fastify.display-name')]
}

function shouldSkipOverride (fn) {
  return !!fn[Symbol.for('skip-override')]
}

function checkDependencies (fn) {
  const meta = getMeta(fn)
  if (!meta) return

  const dependencies = meta.dependencies
  if (!dependencies) return
  assert(Array.isArray(dependencies), 'The dependencies should be an array of strings')

  dependencies.forEach(dependency => {
    assert(
      this[kRegisteredPlugins].indexOf(dependency) > -1,
      `The dependency '${dependency}' of plugin '${meta.name}' is not registered`
    )
  })
}

function checkDecorators (fn) {
  const meta = getMeta(fn)
  if (!meta) return

  const { decorators, name } = meta
  if (!decorators) return

  if (decorators.fastify) _checkDecorators(this, 'Fastify', decorators.fastify, name)
  if (decorators.reply) _checkDecorators(this, 'Reply', decorators.reply, name)
  if (decorators.request) _checkDecorators(this, 'Request', decorators.request, name)
}

const checks = {
  Fastify: exist,
  Request: existRequest,
  Reply: existReply
}

function _checkDecorators (that, instance, decorators, name) {
  assert(Array.isArray(decorators), 'The decorators should be an array of strings')

  decorators.forEach(decorator => {
    const withPluginName = typeof name === 'string' ? ` required by '${name}'` : ''
    if (!checks[instance].call(that, decorator)) {
      throw new FST_ERR_PLUGIN_NOT_PRESENT_IN_INSTANCE(decorator, withPluginName, instance)
    }
  })
}

function checkVersion (fn) {
  const meta = getMeta(fn)
  if (meta?.fastify == null) return

  const requiredVersion = meta.fastify

  const fastifyRc = rcRegex.test(this.version)
  if (fastifyRc === true && semver.gt(this.version, semver.coerce(requiredVersion)) === true) {
    // A Fastify release candidate phase is taking place. In order to reduce
    // the effort needed to test plugins with the RC, we allow plugins targeting
    // the prior Fastify release to be loaded.
    return
  }
  if (requiredVersion && semver.satisfies(this.version, requiredVersion, { includePrerelease: fastifyRc }) === false) {
    // We are not in a release candidate phase. Thus, we must honor the semver
    // ranges defined by the plugin's metadata. Which is to say, if the plugin
    // expects an older version of Fastify than the _current_ version, we will
    // throw an error.
    throw new FST_ERR_PLUGIN_VERSION_MISMATCH(meta.name, requiredVersion, this.version)
  }
}

function registerPluginName (fn) {
  const meta = getMeta(fn)
  if (!meta) return

  const name = meta.name
  if (!name) return
  this[kRegisteredPlugins].push(name)
  return name
}

function checkPluginHealthiness (fn, pluginName) {
  if (fn.constructor.name === 'AsyncFunction' && fn.length === 3) {
    throw new FST_ERR_PLUGIN_INVALID_ASYNC_HANDLER(pluginName)
  }
}

function registerPlugin (fn) {
  const pluginName = registerPluginName.call(this, fn) || getPluginName(fn)
  checkPluginHealthiness.call(this, fn, pluginName)
  checkVersion.call(this, fn)
  checkDecorators.call(this, fn)
  checkDependencies.call(this, fn)
  return shouldSkipOverride(fn)
}

module.exports = {
  getPluginName,
  kRegisteredPlugins,
  setupAvvio
}

module.exports[kTestInternals] = {
  shouldSkipOverride,
  getMeta,
  checkDecorators,
  checkDependencies
}
