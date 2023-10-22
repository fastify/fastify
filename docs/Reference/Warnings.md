
<h1 align="center">Fastify</h1>

## Warnings

### Warnings In Fastify
Warnings are enabled by default, and you can disable it by:

- setting the `NODE_NO_WARNINGS` environment variable to `1`
- passing the `--no-warnings` flag to the node process
- setting 'no-warnings' in the `NODE_OPTIONS` environment variable

However, disabling warnings is not recommended as it may cause
potential problems when upgrading Fastify versions.
Only experienced users should consider disabling warnings.

### Fastify Warning Codes

| Code | Description | How to solve |
| ---- | ----------- | ------------ |
| **FSTWRN001** | The specified schema for a route is missing. This may indicate the schema is not well specified. | Check the schema for the route. |
| **FSTDEP005** | You are accessing the deprecated `request.connection` property. | Use `request.socket`. |
| **FSTDEP006** | You are decorating Request/Reply with a reference type. This reference is shared amongst all requests. | Do not use Arrays/Objects as values when decorating Request/Reply. |
| **FSTDEP007** | You are trying to set a HEAD route using `exposeHeadRoute` route flag when a sibling route is already set. | Remove `exposeHeadRoutes` or explicitly set `exposeHeadRoutes` to `false` |
| **FSTDEP008** | You are using route constraints via the route `{version: "..."}` option.  |  Use `{constraints: {version: "..."}}` option.  |
| **FSTDEP009** | You are using a custom route versioning strategy via the server `{versioning: "..."}` option. |  Use `{constraints: {version: "..."}}` option.  |
| **FSTDEP010** | Modifying the `reply.sent` property is deprecated. | Use the `reply.hijack()` method. |
| **FSTDEP011** | Variadic listen method is deprecated. | Use `.listen(optionsObject)`. |
| **FSTDEP012** | You are trying to access the deprecated `request.context` property. | Use `request.routeOptions.config` or `request.routeOptions.schema`. |
| **FSTDEP013** | Direct return of "trailers" function is deprecated. | Use "callback" or "async-await" for return value. |
| **FSTDEP014** | You are trying to set/access the default route. This property is deprecated. | Use `setNotFoundHandler` if you want to custom a 404 handler or the wildcard (`*`) to match all routes. |
| **FSTDEP015** | You are accessing the deprecated `request.routeSchema` property. | Use `request.routeOptions.schema`. |
| **FSTDEP016** | You are accessing the deprecated `request.routeConfig` property. | Use `request.routeOptions.config`. |
| **FSTDEP017** | You are accessing the deprecated `request.routerPath` property. | Use `request.routeOptions.url`. |
| **FSTDEP018** | You are accessing the deprecated `request.routerMethod` property. | Use `request.routeOptions.method`. |
| **FSTDEP019** | You are accessing the deprecated `reply.context` property. | Use `reply.routeOptions.config` or `reply.routeOptions.schema`. |
