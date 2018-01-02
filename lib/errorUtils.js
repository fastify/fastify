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

function handlePromiseError (err, reply) {
  if (!(err instanceof Error)) {
    throw new TypeError(`Attempted to reject a promise with a non-error value from type '${typeof err}'`)
  } else if (isSystem(err)) {
    reply.res.connection.destroy(err)
    throw err
  }
}

module.exports = {
  handlePromiseError
}
