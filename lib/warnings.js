'use strict'

const { createWarning } = require('process-warning')

/**
 * Deprecation codes:
 *   - FSTWRN001
 *   - FSTSEC001
 *   - FSTDEP020
 *   - FSTDEP021
 *   - FSTDEP022
 *   - FSTDEP023
 *   - FSTDEP024
 *   - FSTDEP025
 *   - FSTDEP026
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

const FSTWRN004 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTWRN004',
  message: 'It seems that you are overriding an errorHandler in the same scope, which can lead to subtle bugs.',
  unlimited: true
})

const FSTSEC001 = createWarning({
  name: 'FastifySecurity',
  code: 'FSTSEC001',
  message: 'You are using /%s/ Content-Type which may be vulnerable to CORS attack. Please make sure your RegExp start with "^" or include ";?" to proper detection of the essence MIME type.',
  unlimited: true
})

const FSTDEP020 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTDEP020',
  message: 'options.ignoreTrailingSlash property access is deprecated. Please use "options.routerOptions.ignoreTrailingSlash" instead for accessing router options. The "options.ignoreTrailingSlash" will be removed in `fastify@6`.',
  unlimited: true
})

const FSTDEP021 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTDEP021',
  message: 'options.ignoreDuplicateSlashes property access is deprecated. Please use "options.routerOptions.ignoreDuplicateSlashes" instead for accessing router options. The "options.ignoreDuplicateSlashes" will be removed in `fastify@6`.',
  unlimited: true

})

const FSTDEP022 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTDEP022',
  message: 'options.maxParamLength property access is deprecated. Please use "options.routerOptions.maxParamLength" instead for accessing router options. The "options.maxParamLength" will be removed in `fastify@6`.',
  unlimited: true

})

const FSTDEP023 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTDEP023',
  message: 'options.caseSensitive property access is deprecated. Please use "options.routerOptions.caseSensitive" instead for accessing router options. The "options.caseSensitive" will be removed in `fastify@6`.',
  unlimited: true
})

const FSTDEP024 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTDEP024',
  message: 'options.allowUnsafeRegex property access is deprecated. Please use "options.routerOptions.allowUnsafeRegex" instead for accessing router options. The "options.allowUnsafeRegex" will be removed in `fastify@6`.',
  unlimited: true
})

const FSTDEP025 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTDEP025',
  message: 'options.querystringParser property access is deprecated. Please use "options.routerOptions.querystringParser" instead for accessing router options. The "options.querystringParser" will be removed in `fastify@6`.'
})

const FSTDEP026 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTDEP026',
  message: 'options.useSemicolonDelimiter property access is deprecated. Please use "options.routerOptions.useSemicolonDelimiter" instead for accessing router options. The "options.useSemicolonDelimiter" will be removed in `fastify@6`.'
})

const FSTDEP027 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTDEP027',
  message: 'options.constraints property access is deprecated. Please use "options.routerOptions.constraints" instead for accessing router options. The "options.constraints" will be removed in `fastify@6`.'
})

module.exports = {
  FSTWRN001,
  FSTWRN003,
  FSTWRN004,
  FSTSEC001
  FSTDEP020,
  FSTDEP021,
  FSTDEP022,
  FSTDEP023,
  FSTDEP024,
  FSTDEP025,
  FSTDEP026,
  FSTDEP027
}
