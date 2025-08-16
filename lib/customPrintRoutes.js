'use strict'

function customPrintRoutes (router, opts = {}) {
  if (opts.commonPrefix !== false) {
    return router.prettyPrint(opts)
  }

  const routes = Array.isArray(router.routes) ? router.routes : []
  const output = []

  for (const route of routes) {
    const methods = Array.isArray(route.methods)
      ? route.methods
      : route.method
        ? [route.method]
        : []

    for (const method of methods) {
      output.push(`${method.toUpperCase()} ${route.path}`)
    }
  }

  return output.join('\n')
}

module.exports = customPrintRoutes
