'use strict'

const warning = require('process-warning')()

/**
 * Deprecation codes:
 *   - FSTDEP005
 *   - FSTDEP006
 *   - FSTDEP007
 *   - FSTDEP008
 *   - FSTDEP009
 *   - FSTDEP010
 *   - FSTDEP012
 *   - FSTDEP013
 *   - FSTDEP014
 *   - FSTDEP015
 *   - FSTDEP016
 *   - FSTDEP017
 *   - FSTDEP018
 *   - FSTDEP019
 *   - FSTWRN001
 *   - FSTWRN002
 */

warning.createDeprecation('FSTDEP005', 'You are accessing the deprecated "request.connection" property. Use "request.socket" instead.')

warning.createDeprecation('FSTDEP006', 'You are decorating Request/Reply with a reference type. This reference is shared amongst all requests. Use onRequest hook instead. Property: %s')

warning.createDeprecation('FSTDEP007', 'You are trying to set a HEAD route using "exposeHeadRoute" route flag when a sibling route is already set. See documentation for more info.')

warning.createDeprecation('FSTDEP008', 'You are using route constraints via the route { version: "..." } option, use { constraints: { version: "..." } } option instead.')

warning.createDeprecation('FSTDEP009', 'You are using a custom route versioning strategy via the server { versioning: "..." } option, use { constraints: { version: "..." } } option instead.')

warning.createDeprecation('FSTDEP010', 'Modifying the "reply.sent" property is deprecated. Use the "reply.hijack()" method instead.')

warning.createDeprecation('FSTDEP012', 'request.context property access is deprecated. Please use "request.routeOptions.config" or "request.routeOptions.schema" instead for accessing Route settings. The "request.context" will be removed in `fastify@5`.')

warning.createDeprecation('FSTDEP013', 'Direct return of "trailers" function is deprecated. Please use "callback" or "async-await" for return value. The support of direct return will removed in `fastify@5`.')

warning.createDeprecation('FSTDEP014', 'You are trying to set/access the default route. This property is deprecated. Please, use setNotFoundHandler if you want to custom a 404 handler or the wildcard (*) to match all routes.')

warning.createDeprecation('FSTDEP015', 'You are accessing the deprecated "request.routeSchema" property. Use "request.routeOptions.schema" instead. Property "req.routeSchema" will be removed in `fastify@5`.')

warning.createDeprecation('FSTDEP016', 'You are accessing the deprecated "request.routeConfig" property. Use "request.routeOptions.config" instead. Property "req.routeConfig" will be removed in `fastify@5`.')

warning.createDeprecation('FSTDEP017', 'You are accessing the deprecated "request.routerPath" property. Use "request.routeOptions.url" instead. Property "req.routerPath" will be removed in `fastify@5`.')

warning.createDeprecation('FSTDEP018', 'You are accessing the deprecated "request.routerMethod" property. Use "request.routeOptions.method" instead. Property "req.routerMethod" will be removed in `fastify@5`.')

warning.createDeprecation('FSTDEP019', 'reply.context property access is deprecated. Please use "request.routeOptions.config" or "request.routeOptions.schema" instead for accessing Route settings. The "reply.context" will be removed in `fastify@5`.')

warning.create('FastifyWarning', 'FSTWRN001', 'The %s schema for %s: %s is missing. This may indicate the schema is not well specified.', { unlimited: true })

warning.create('FastifyWarning', 'FSTWRN002', 'The %s plugin being registered mixes async and callback styles, which will result in an error in `fastify@5`', { unlimited: true })

module.exports = warning
