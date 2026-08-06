'use strict'

const { createWarning } = require('process-warning')

/**
 * Deprecation codes:
 *   - FSTWRN001
 *   - FSTSEC001
 *   - FSTDEP024
 *   - FSTDEP025
 *
 * Deprecation Codes FSTDEP001 - FSTDEP021 were used by v4 and MUST NOT be reused.
 *                             - FSTDEP022 - FSTDEP025 are used by v5 and MUST NOT be reused.
 * Warning Codes FSTWRN001 - FSTWRN002 were used by v4 and MUST NOT be reused.
 */

const FSTWRN001 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTWRN001',
  message: 'The %s schema for %s: %s is missing. This may indicate the schema is not well specified.',
  unlimited: true
})

const FSTWRN003 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTWRN003',
  message: 'The %s mixes async and callback styles that may lead to unhandled rejections. Please use only one of them.',
  unlimited: true
})

const FSTSEC001 = createWarning({
  name: 'FastifySecurity',
  code: 'FSTSEC001',
  message: 'You are using /%s/ Content-Type which may be vulnerable to CORS attack. Please make sure your RegExp start with "^" or include ";?" to proper detection of the essence MIME type.',
  unlimited: true
})

const FSTDEP024 = createWarning({
  name: 'FastifyDeprecation',
  code: 'FSTDEP024',
  message: 'requestIdLogLabel option is deprecated. Use the logController option with requestIdLogLabel instead. The requestIdLogLabel top-level option will be removed in `fastify@6`.',
  unlimited: true
})

const FSTDEP025 = createWarning({
  name: 'FastifyDeprecation',
  code: 'FSTDEP025',
  message: 'Calling addHttpMethod for existing method "%s" without { overrideExisting: true } is deprecated. In Fastify v6, this will throw an error.',
  unlimited: true
})

module.exports = {
  FSTWRN001,
  FSTWRN003,
  FSTSEC001,
  FSTDEP024,
  FSTDEP025
}
