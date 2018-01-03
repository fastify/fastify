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

function handlePromiseError (err, reply) {
  if (!(err instanceof Error)) {
    var error = new TypeError(`Attempted to reject a promise with a non-error value from type '${typeof err}'`)
    reply.res.connection.emit('error', causedBy(error, err))
    throw error
  } else if (isSystem(err)) {
    reply.res.connection.emit('error', err)
    throw err
  }
}

module.exports = {
  handlePromiseError
}
