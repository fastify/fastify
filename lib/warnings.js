'use strict'

const { format } = require('node:util')

/**
 * Deprecation codes:
 *   - FSTWRN001
 *   - FSTSEC001
 *   - FSTDEP022
 *   - FSTDEP023
 *   - FSTDEP024
 *
 * Deprecation Codes FSTDEP001 - FSTDEP021 were used by v4 and MUST NOT be reused.
 *                             - FSTDEP022 is used by v5 and MUST NOT be reused.
 * Warning Codes FSTWRN001 - FSTWRN002 were used by v4 and MUST NOT be reused.
 */

const warningDefinitions = {
  FSTWRN001: {
    name: 'FastifyWarning',
    code: 'FSTWRN001',
    message: 'The %s schema for %s: %s is missing. This may indicate the schema is not well specified.',
    unlimited: true
  },
  FSTWRN003: {
    name: 'FastifyWarning',
    code: 'FSTWRN003',
    message: 'The %s mixes async and callback styles that may lead to unhandled rejections. Please use only one of them.',
    unlimited: true
  },
  FSTWRN004: {
    name: 'FastifyWarning',
    code: 'FSTWRN004',
    message: 'It seems that you are overriding an errorHandler in the same scope, which can lead to subtle bugs. To disable this behavior, set \'allowErrorHandlerOverride\' to false. For more information, visit: https://fastify.dev/docs/latest/Reference/Server/#allowerrorhandleroverride',
    unlimited: true
  },
  FSTSEC001: {
    name: 'FastifySecurity',
    code: 'FSTSEC001',
    message: 'You are using /%s/ Content-Type which may be vulnerable to CORS attack. Please make sure your RegExp start with "^" or include ";?" to proper detection of the essence MIME type.',
    unlimited: true
  },
  FSTDEP022: {
    name: 'FastifyWarning',
    code: 'FSTDEP022',
    message: 'The router options for %s property access is deprecated. Please use "options.routerOptions" instead for accessing router options. The router options will be removed in `fastify@6`.',
    unlimited: true
  },
  FSTDEP023: {
    name: 'FastifyDeprecation',
    code: 'FSTDEP023',
    message: 'disableRequestLogging option is deprecated. Use the logController option with disableRequestLogging or isLogDisabled override instead. The disableRequestLogging top-level option will be removed in `fastify@6`.',
    unlimited: true
  },
  FSTDEP024: {
    name: 'FastifyDeprecation',
    code: 'FSTDEP024',
    message: 'requestIdLogLabel option is deprecated. Use the logController option with requestIdLogLabel instead. The requestIdLogLabel top-level option will be removed in `fastify@6`.',
    unlimited: true
  }
}

function Warnings (opts = { withProcess: true }) {
  this.withProcess = opts.withProcess
  this.definitions = new Map()
  this.emitted = new Set()

  for (const definition of Object.values(warningDefinitions)) {
    this.add(definition.name, definition.code, definition.message, definition.unlimited)
  }
}

Warnings.prototype.add = function add (name, code, message, unlimited = false) {
  this.definitions.set(code, {
    name,
    code,
    message,
    unlimited,
    listeners: []
  })
  return this
}

Warnings.prototype.emit = function emit (code, ...args) {
  const warning = this.definitions.get(code)

  if (warning === undefined) {
    return false
  }

  if (warning.unlimited !== true && this.emitted.has(code)) {
    return false
  }

  this.emitted.add(code)

  const formattedWarning = {
    name: warning.name,
    code: warning.code,
    message: format(warning.message, ...args)
  }

  for (const listener of warning.listeners) {
    listener(formattedWarning)
  }

  if (this.withProcess === true) {
    process.emitWarning(formattedWarning.message, formattedWarning.name, formattedWarning.code)
  }

  return true
}

Warnings.prototype.has = function has (code) {
  return this.definitions.has(code)
}

Warnings.prototype.remove = function remove (code) {
  this.definitions.delete(code)
  this.emitted.delete(code)
  return this
}

Warnings.prototype.on = function on (code, listener) {
  const warning = this.definitions.get(code)
  if (warning !== undefined) {
    warning.listeners.push(listener)
  }
  return this
}

function buildPublicWarningsOptions (warnings) {
  const warningsOptions = {
    has: warnings.has.bind(warnings),
    remove: warnings.remove.bind(warnings),
    on: warnings.on.bind(warnings)
  }

  Object.defineProperty(warningsOptions, 'withProcess', {
    enumerable: true,
    get () {
      return warnings.withProcess
    },
    set (value) {
      warnings.withProcess = value
    }
  })

  return warningsOptions
}

module.exports = {
  Warnings,
  buildPublicWarningsOptions
}
