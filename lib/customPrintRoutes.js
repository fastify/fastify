function customPrintRoutes(router, opts) {
  if (!opts) opts = {}

  if (opts.commonPrefix !== false) {
    return router.prettyPrint(opts)
  }

  // fallback to raw list of routes
  const routes = router.routes || []

  return routes
    .map(route => `${route.method} ${route.path}`)
    .join('\n')
}

module.exports = customPrintRoutes
