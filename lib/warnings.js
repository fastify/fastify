'use strict'

const { createWarning } = require('fastify-warning')

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
