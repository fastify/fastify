'use strict'

const Assert = require('assert')

const systemErrors = [

  // JavaScript
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,

  // Node
  Assert.AssertionError
]

function isSystem (err) {
  for (var i = 0; i < systemErrors.length; i++) {
    var type = systemErrors[i]
    if (err instanceof type) {
      return true
    }
  }
}

function causedBy (err, cause) {
  err.cause = cause
  return err
}

function throwError (err) {
  throw err
}

function handlePromiseError (err, reply) {
  if (!(err instanceof Error)) {
    var error = new TypeError(`Attempted to reject a promise with a non-error value from type '${typeof err}'`)
    setImmediate(throwError, error)
    var errWithCause = causedBy(error, err)
    reply.request.log.error(errWithCause, 'client error')
    reply.res.connection.destroy(errWithCause)
    return true
  } else if (isSystem(err)) {
    setImmediate(throwError, err)
    reply.request.log.error(err, 'client error')
    reply.res.connection.destroy(err)
    return true
  }
  return false
}

module.exports = {
  handlePromiseError
}
