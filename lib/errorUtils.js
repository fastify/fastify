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

module.exports = {
  isSystem
}
