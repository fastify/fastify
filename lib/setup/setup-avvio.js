const Avvio = require('avvio')
const override = require('../pluginOverride.js')
const { kState, kAvvioBoot, kKeepAliveConnections } = require('../symbols.js')
const { hookRunnerApplication } = require('../hooks.js')

/**
 * @see {@link https://github.com/fastify/avvio}
 *
 * Initializes and configures the Avvio package bootstrapping Fastify.
 * Avvio is responsible for loading plugins in the correct order and managing
 * plugin encapsulation.
 *
 * The following Fastify methods are overridden:
 * - register
 * - after
 * - ready
 * - onClose
 * - close
 *
 * @param {import('../../fastify.js').FastifyInstance} fastify
 * @param {object} opts
 * @param {import('../../fastify.js').FastifyServerOptions} opts.options
 * @param {object} opts.defaultInitOptions
 * @param {boolean|string} opts.forceCloseConnections
 * @param {boolean} opts.serverHasCloseAllConnections
 * @param {object} opts.router
 * @returns {object} The configured Avvio instance.
 */
function setupAvvio (fastify, opts) {
  const {
    options,
    defaultInitOptions,
    forceCloseConnections,
    serverHasCloseAllConnections,
    router
  } = opts

  const avvioPluginTimeout = Number(options.pluginTimeout)
  const avvio = Avvio(fastify, {
    autostart: false,
    timeout: isNaN(avvioPluginTimeout) === false ? avvioPluginTimeout : defaultInitOptions.pluginTimeout,
    expose: {
      use: 'register'
    }
  })

  /**
   * @see {@link https://github.com/fastify/avvio?tab=readme-ov-file#override}
   *
   * Allows overriding Fastify for each loading plugin.
   */
  avvio.override = override
  avvio.on('start', () => (fastify[kState].started = true))
  fastify[kAvvioBoot] = fastify.ready // the avvio ready function
  fastify.printPlugins = avvio.prettyPrint.bind(avvio)

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

  return avvio
}

module.exports = setupAvvio
