'use strict'

const { kState, kAvvioBoot } = require('./symbols')
const PonyPromise = require('./promise')
const { hookRunnerApplication } = require('./hooks')
const { appendStackTrace, AVVIO_ERRORS_MAP } = require('./errors')

module.exports = function createReadyFunction (fastify) {
  return function ready (cb) {
    if (this[kState].readyResolver !== null) {
      if (cb != null) {
        this[kState].readyResolver.promise.then(() => cb(null, fastify), cb)
        return
      }

      return this[kState].readyResolver.promise
    }

    // run the hooks after returning the promise
    process.nextTick(runHooks)

    // Create a promise no matter what
    // It will work as a barrier for all the .ready() calls (ensuring single hook execution)
    // as well as a flow control mechanism to chain cbs and further
    // promises
    this[kState].readyResolver = PonyPromise.withResolvers()

    if (!cb) {
      return this[kState].readyResolver.promise
    } else {
      this[kState].readyResolver.promise.then(() => cb(null, fastify), cb)
    }

    function runHooks () {
      // start loading
      fastify[kAvvioBoot]((err, done) => {
        if (err || fastify[kState].started || fastify[kState].ready || fastify[kState].booting) {
          manageErr(err)
        } else {
          fastify[kState].booting = true
          hookRunnerApplication('onReady', fastify[kAvvioBoot], fastify, manageErr)
        }
        done()
      })
    }

    function manageErr (err) {
      // If the error comes out of Avvio's Error codes
      // We create a make and preserve the previous error
      // as cause
      err = err != null && AVVIO_ERRORS_MAP[err.code] != null
        ? appendStackTrace(err, new AVVIO_ERRORS_MAP[err.code](err.message))
        : err

      if (err) {
        return fastify[kState].readyResolver.reject(err)
      }

      fastify[kState].readyResolver.resolve(fastify)
      fastify[kState].booting = false
      fastify[kState].ready = true
      fastify[kState].readyResolver = null
    }
  }
}
