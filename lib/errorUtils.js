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
  for (let type of types.system) {
    if (err instanceof type) {
      throw err
    }
  }
}

module.exports = {
  reflectSystemErrors
}
