'use strict'

function hookRunner (functions, context) {
  functions = functions.map(fn => fn.bind(context))

  return function runHooks (runner, state, cb) {
    var i = 0

    function next (err, value) {
      if (err) {
        cb(err, state)
        return
      }

      if (value !== undefined) {
        state = value
      }

      if (i === functions.length) {
        cb(null, state)
        return
      }

      const result = runner(functions[i++], state, next)
      if (result && typeof result.then === 'function') {
        result.then(handleResolve, handleReject)
      }
    }

    function handleResolve (value) {
      next(null, value)
    }

    function handleReject (err) {
      cb(err, state)
    }

    next()
  }
}

module.exports = hookRunner
