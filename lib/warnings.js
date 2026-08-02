'use strict'

const { createWarning } = require('process-warning')

/**
 * Warning codes:
 *   - FSTWRN001
 *   - FSTSEC001
 *   - FSTSEC002
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

const FSTSEC002 = createWarning({
  name: 'FastifySecurity',
  code: 'FSTSEC002',
  message: 'The headers schema for %s: %s references an external $ref (%s) that is not case-normalized. Header names in the referenced schema keep their original case and will not match the lowercased request headers, so case-insensitive assertions such as required and dependencies may not apply. Inline the header schema instead of referencing it with an external $ref.',
  unlimited: true
})

module.exports = {
  FSTWRN001,
  FSTWRN003,
  FSTSEC001,
  FSTSEC002
}
