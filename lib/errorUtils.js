'use strict'

const Assert = require('assert')

const types = {
  system: [

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
}

function reflectSystemErrors (err) {
  for (let i = 0; i < types.system.length; i++) {
    if (err instanceof types.system[i]) {
      throw err
    }
  }
}

module.exports = {
  reflectSystemErrors
}
