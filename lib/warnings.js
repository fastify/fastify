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

warning.create('FastifyDeprecation', 'FSTDEP012', 'request.context property access is deprecated. Please use "request.routeOptions.config" or "request.routeOptions.schema" instead for accessing Route settings. The "request.context" will be removed in `fastify@5`.')

warning.create('FastifyDeprecation', 'FSTDEP013', 'Direct return of "trailers" function is deprecated. Please use "callback" or "async-await" for return value. The support of direct return will removed in `fastify@5`.')

warning.create('FastifyDeprecation', 'FSTDEP014', 'You are trying to set/access the default route. This property is deprecated. Please, use setNotFoundHandler if you want to custom a 404 handler or the wildcard (*) to match all routes.')

warning.create('FastifyDeprecation', 'FSTDEP015', 'You are accessing the deprecated "request.routeSchema" property. Use "request.routeOptions.schema" instead. Property "req.routeSchema" will be removed in `fastify@5`.')

warning.create('FastifyDeprecation', 'FSTDEP016', 'You are accessing the deprecated "request.routeConfig" property. Use "request.routeOptions.config" instead. Property "req.routeConfig" will be removed in `fastify@5`.')

warning.create('FastifyDeprecation', 'FSTDEP017', 'You are accessing the deprecated "request.routerPath" property. Use "request.routeOptions.url" instead. Property "req.routerPath" will be removed in `fastify@5`.')

warning.create('FastifyDeprecation', 'FSTDEP018', 'You are accessing the deprecated "request.routerMethod" property. Use "request.routeOptions.method" instead. Property "req.routerMethod" will be removed in `fastify@5`.')

warning.create('FastifyDeprecation', 'FSTDEP019', 'reply.context property access is deprecated. Please use "reply.routeOptions.config" or "reply.routeOptions.schema" instead for accessing Route settings. The "reply.context" will be removed in `fastify@5`.')

warning.create('FastifyWarning', 'FSTWRN001', 'The %s schema for %s: %s is missing. This may indicate the schema is not well specified.', { unlimited: true })

module.exports = warning
