'use strict'

const { createWarning } = require('process-warning')

/**
 * Deprecation codes:
 *   - FSTWRN001
 *   - FSTSEC001
 *
 * Deprecation Codes FSTDEP001 - FSTDEP021 were used by v4 and MUST NOT not be reused.
 * Warning Codes FSTWRN001 - FSTWRN002 were used by v4 and MUST NOT not be reused.
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

module.exports = {
  FSTWRN001,
  FSTWRN003,
  FSTSEC001
}
