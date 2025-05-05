const { appendStackTrace, AVVIO_ERRORS_MAP } = require('../errors.js')
const { hookRunnerApplication } = require('../hooks.js')
const { kState, kAvvioBoot } = require('../symbols.js')

module.exports = function setupReady (fastify) {
  return function ready (cb) {
    if (this[kState].readyPromise !== null) {
      if (cb != null) {
        this[kState].readyPromise.then(() => cb(null, fastify), cb)
        return
      }

      return this[kState].readyPromise
    }

    let resolveReady
    let rejectReady

    // run the hooks after returning the promise
    process.nextTick(runHooks)

    // Create a promise no matter what
    // It will work as a barrier for all the .ready() calls (ensuring single hook execution)
    // as well as a flow control mechanism to chain cbs and further
    // promises
    this[kState].readyPromise = new Promise(function (resolve, reject) {
      resolveReady = resolve
      rejectReady = reject
    })

    if (!cb) {
      return this[kState].readyPromise
    } else {
      this[kState].readyPromise.then(() => cb(null, fastify), cb)
    }

    function runHooks () {
      // start loading
      fastify[kAvvioBoot]((err, done) => {
        if (err || fastify[kState].started || fastify[kState].ready || fastify[kState].booting) {
          handleReadyPromise(err)
        } else {
          fastify[kState].booting = true
          hookRunnerApplication('onReady', fastify[kAvvioBoot], fastify, handleReadyPromise)
        }
        done()
      })
    }

    function handleReadyPromise (err) {
      // If the error comes out of Avvio's Error codes
      // We create a make and preserve the previous error
      // as cause
      err = err != null && AVVIO_ERRORS_MAP[err.code] != null
        ? appendStackTrace(err, new AVVIO_ERRORS_MAP[err.code](err.message))
        : err

      if (err) {
        return rejectReady(err)
      }

      resolveReady(fastify)
      fastify[kState].booting = false
      fastify[kState].ready = true
      fastify[kState].readyPromise = null
    }
  }
}
