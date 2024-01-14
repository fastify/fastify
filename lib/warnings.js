'use strict'

const { createDeprecation, createWarning } = require('process-warning')

const FSTDEP005 = createDeprecation({
  code: 'FSTDEP005',
  message: 'You are accessing the deprecated "request.connection" property. Use "request.socket" instead.'
})

const FSTDEP006 = createDeprecation({
  code: 'FSTDEP006',
  message: 'You are decorating Request/Reply with a reference type. This reference is shared amongst all requests. Use onRequest hook instead. Property: %s'
})

const FSTDEP007 = createDeprecation({
  code: 'FSTDEP007',
  message: 'You are trying to set a HEAD route using "exposeHeadRoute" route flag when a sibling route is already set. See documentation for more info.'
})

const FSTDEP008 = createDeprecation({
  code: 'FSTDEP008',
  message: 'You are using route constraints via the route { version: "..." } option, use { constraints: { version: "..." } } option instead.'
})

const FSTDEP009 = createDeprecation({
  code: 'FSTDEP009',
  message: 'You are using a custom route versioning strategy via the server { versioning: "..." } option, use { constraints: { version: "..." } } option instead.'
})

const FSTDEP010 = createDeprecation({
  code: 'FSTDEP010',
  message: 'Modifying the "reply.sent" property is deprecated. Use the "reply.hijack()" method instead.'
})

const FSTDEP011 = createDeprecation({
  code: 'FSTDEP011',
  message: 'Variadic listen method is deprecated. Please use ".listen(optionsObject)" instead. The variadic signature will be removed in `fastify@5`.'
})

const FSTDEP012 = createDeprecation({
  code: 'FSTDEP012',
  message: 'request.context property access is deprecated. Please use "request.routeOptions.config" or "request.routeOptions.schema" instead for accessing Route settings. The "request.context" will be removed in `fastify@5`.'
})

const FSTDEP013 = createDeprecation({
  code: 'FSTDEP013',
  message: 'Direct return of "trailers" function is deprecated. Please use "callback" or "async-await" for return value. The support of direct return will removed in `fastify@5`.'
})

const FSTDEP014 = createDeprecation({
  code: 'FSTDEP014',
  message: 'You are trying to set/access the default route. This property is deprecated. Please, use setNotFoundHandler if you want to custom a 404 handler or the wildcard (*) to match all routes.'
})

const FSTDEP015 = createDeprecation({
  code: 'FSTDEP015',
  message: 'You are accessing the deprecated "request.routeSchema" property. Use "request.routeOptions.schema" instead. Property "req.routeSchema" will be removed in `fastify@5`.'
})

const FSTDEP016 = createDeprecation({
  code: 'FSTDEP016',
  message: 'You are accessing the deprecated "request.routeConfig" property. Use "request.routeOptions.config" instead. Property "req.routeConfig" will be removed in `fastify@5`.'
})

const FSTDEP017 = createDeprecation({
  code: 'FSTDEP017',
  message: 'You are accessing the deprecated "request.routerPath" property. Use "request.routeOptions.url" instead. Property "req.routerPath" will be removed in `fastify@5`.'
})

const FSTDEP018 = createDeprecation({
  code: 'FSTDEP018',
  message: 'You are accessing the deprecated "request.routerMethod" property. Use "request.routeOptions.method" instead. Property "req.routerMethod" will be removed in `fastify@5`.'
})

const FSTDEP019 = createDeprecation({
  code: 'FSTDEP019',
  message: 'reply.context property access is deprecated. Please use "request.routeOptions.config" or "request.routeOptions.schema" instead for accessing Route settings. The "reply.context" will be removed in `fastify@5`.'
})

const FSTDEP020 = createDeprecation({
  code: 'FSTDEP020',
  message: 'You are using the deprecated "reply.getResponseTime()"" method. Use the "request.elapsedTime" property instead. Method "reply.getResponseTime()" will be removed in `fastify@5`.'
})

const FSTWRN001 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTWRN001',
  message: 'The %s schema for %s: %s is missing. This may indicate the schema is not well specified.',
  unlimited: true
})

const FSTWRN002 = createWarning({
  name: 'FastifyWarning',
  code: 'FSTWRN002',
  message: 'The %s plugin being registered mixes async and callback styles, which will result in an error in `fastify@5`',
  unlimited: true
})

module.exports = {
  FSTDEP005,
  FSTDEP006,
  FSTDEP007,
  FSTDEP008,
  FSTDEP009,
  FSTDEP010,
  FSTDEP011,
  FSTDEP012,
  FSTDEP013,
  FSTDEP014,
  FSTDEP015,
  FSTDEP016,
  FSTDEP017,
  FSTDEP018,
  FSTDEP019,
  FSTDEP020,
  FSTWRN001,
  FSTWRN002
}
