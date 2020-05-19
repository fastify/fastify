'use strict'

const { inherits, format } = require('util')
const codes = {}
const emittedWarnings = new Map()
const { kTestInternals } = require('./symbols')

/**
 * Deprecation codes:
 *   - FSTDEP001
 *   - FSTDEP002
 *   - FSTDEP003
 *   - FSTDEP004
 */

createWarning('FastifyDeprecation', 'FSTDEP001', 'You are accessing the Node.js core request object via "request.req", Use "request.raw" instead.')

createWarning('FastifyDeprecation', 'FSTDEP002', 'You are accessing the Node.js core response object via "reply.res", Use "reply.raw" instead.')

createWarning('FastifyDeprecation', 'FSTDEP003', 'You are using the legacy Content Type Parser function signature. Use the one suggested in the documentation instead.')

createWarning('FastifyDeprecation', 'FSTDEP004', 'You are using the legacy preParsing hook signature. Use the one suggested in the documentation instead.')

function createWarning (name, code, message) {
  if (!code) throw new Error('Fastify warning code must not be empty')
  if (!message) throw new Error('Fastify warning message must not be empty')

  code = code.toUpperCase()

  function FastifyWarning (a, b, c) {
    Error.captureStackTrace(this, FastifyWarning)
    this.name = name
    this.code = code

    // more performant than spread (...) operator
    if (a && b && c) {
      this.message = format(message, a, b, c)
    } else if (a && b) {
      this.message = format(message, a, b)
    } else if (a) {
      this.message = format(message, a)
    } else {
      this.message = message
    }
  }
  FastifyWarning.prototype[Symbol.toStringTag] = 'Warning'

  FastifyWarning.prototype.toString = function () {
    return `${this.name} [${this.code}]: ${this.message}`
  }

  inherits(FastifyWarning, Error)

  codes[code] = FastifyWarning

  return codes[code]
}

function emitWarning (code) {
  if (codes[code] === undefined) throw new Error(`The code '${code}' does not exist`)
  if (emittedWarnings.has(code) === true) return
  emittedWarnings.set(code, true)
  process.emitWarning(new codes[code]())
}

module.exports = { codes, createWarning, emitWarning }
module.exports[kTestInternals] = { emittedWarnings }
