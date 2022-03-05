'use strict'

const warning = require('process-warning')()

/**
 * Deprecation codes:
 *   - FSTDEP005
 */

warning.create('FastifyDeprecation', 'FSTDEP005', 'You are accessing the deprecated "request.connection" property. Use "request.socket" instead.')

warning.create('FastifyDeprecation', 'FSTDEP006', 'You are decorating Request/Reply with a reference type. This reference is shared amongst all requests. Use onRequest hook instead. Property: %s')

warning.create('FastifyDeprecation', 'FSTDEP007', 'You are trying to set a HEAD route using "exposeHeadRoute" route flag when a sibling route is already set. See documentation for more info.')

warning.create('FastifyDeprecation', 'FSTDEP008', 'You are using route constraints via the route { version: "..." } option, use { constraints: { version: "..." } } option instead.')

warning.create('FastifyDeprecation', 'FSTDEP009', 'You are using a custom route versioning strategy via the server { versioning: "..." } option, use { constraints: { version: "..." } } option instead.')

warning.create('FastifyDeprecation', 'FSTDEP010', 'Modifying the "reply.sent" property is deprecated. Use the "reply.hijack()" method instead.')

warning.create('FastifyDeprecation', 'FSTDEP011', 'Variadic listen method is deprecated. Please use ".listen(optionsObject)" instead. The variadic signature will be removed in `fastify@5`.')

module.exports = warning
