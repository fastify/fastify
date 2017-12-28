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

function reflect (err, types) {
  if (match(err, types)) {
    toss(err)
  }
}

function toss (err, rethrow) {
  if (rethrow || canHandlePromiseRejection()) {
    throw err
  } else {
    // fallback cause DEP0018
    process.exit(1)
  }
}

function isSystem (err) {
  return match(err, types.system)
}

function canHandlePromiseRejection () {
  return process.listenerCount('unhandledRejection') > 0
}

function match (err, types) {
  if (!types) {
    return false
  }

  if (types.find(type => err instanceof type)) {
    return true
  }

  return false
}

module.exports = {
  isSystem,
  types,
  reflect,
  toss
}
