
<h1 align="center">Fastify</h1>

## Warnings

### Warnings In Fastify
Warnings are enabled by default. They can be disabled by using any
of the following methods:

- setting the `NODE_NO_WARNINGS` environment variable to `1`
- passing the `--no-warnings` flag to the node process
- setting 'no-warnings' in the `NODE_OPTIONS` environment variable

For more information on how to disable warnings, see [node's documentation](https://nodejs.org/api/cli.html).

However, disabling warnings is not recommended as it may cause
potential problems when upgrading Fastify versions.
Only experienced users should consider disabling warnings.

### Fastify Warning Codes

| Code | Description | How to solve | Discussion |
| ---- | ----------- | ------------ | ---------- |
| **FSTWRN001** | The specified schema for a route is missing. This may indicate the schema is not well specified. | Check the schema for the route. | [#4647](https://github.com/fastify/fastify/pull/4647) |
| **FSTWRN002** | The %s plugin being registered mixes async and callback styles, which will result in an error in `fastify@5`. | Do not mix async and callback style. | [#5139](https://github.com/fastify/fastify/pull/5139) |


### Fastify Deprecation Codes

Deprecation codes are further supported by the Node.js CLI options:

- [--no-deprecation](https://nodejs.org/api/cli.html#--no-deprecation)
- [--throw-deprecation](https://nodejs.org/api/cli.html#--throw-deprecation)
- [--trace-deprecation](https://nodejs.org/api/cli.html#--trace-deprecation)


| Code | Description | How to solve | Discussion |
| ---- | ----------- | ------------ | ---------- |
| **FSTDEP005** | You are accessing the deprecated `request.connection` property. | Use `request.socket`. | [#2594](https://github.com/fastify/fastify/pull/2594) |
| **FSTDEP006** | You are decorating Request/Reply with a reference type. This reference is shared amongst all requests. | Do not use Arrays/Objects as values when decorating Request/Reply. | [#2688](https://github.com/fastify/fastify/pull/2688) |
| **FSTDEP007** | You are trying to set a HEAD route using `exposeHeadRoute` route flag when a sibling route is already set. | Remove `exposeHeadRoutes` or explicitly set `exposeHeadRoutes` to `false` | [#2700](https://github.com/fastify/fastify/pull/2700) |
| **FSTDEP008** | You are using route constraints via the route `{version: "..."}` option.  |  Use `{constraints: {version: "..."}}` option.  | [#2682](https://github.com/fastify/fastify/pull/2682) |
| **FSTDEP009** | You are using a custom route versioning strategy via the server `{versioning: "..."}` option. |  Use `{constraints: {version: "..."}}` option.  | [#2682](https://github.com/fastify/fastify/pull/2682) |
| **FSTDEP010** | Modifying the `reply.sent` property is deprecated. | Use the `reply.hijack()` method. | [#3140](https://github.com/fastify/fastify/pull/3140) |
| **FSTDEP011** | Variadic listen method is deprecated. | Use `.listen(optionsObject)`. | [#3712](https://github.com/fastify/fastify/pull/3712) |
| **FSTDEP012** | You are trying to access the deprecated `request.context` property. | Use `request.routeOptions.config` or `request.routeOptions.schema`. | [#4216](https://github.com/fastify/fastify/pull/4216) [#5084](https://github.com/fastify/fastify/pull/5084) |
| **FSTDEP013** | Direct return of "trailers" function is deprecated. | Use "callback" or "async-await" for return value. | [#4380](https://github.com/fastify/fastify/pull/4380) |
| **FSTDEP014** | You are trying to set/access the default route. This property is deprecated. | Use `setNotFoundHandler` if you want to custom a 404 handler or the wildcard (`*`) to match all routes. | [#4480](https://github.com/fastify/fastify/pull/4480) |
| **FSTDEP015** | You are accessing the deprecated `request.routeSchema` property. | Use `request.routeOptions.schema`. | [#4470](https://github.com/fastify/fastify/pull/4470) |
| **FSTDEP016** | You are accessing the deprecated `request.routeConfig` property. | Use `request.routeOptions.config`. | [#4470](https://github.com/fastify/fastify/pull/4470) |
| **FSTDEP017** | You are accessing the deprecated `request.routerPath` property. | Use `request.routeOptions.url`. | [#4470](https://github.com/fastify/fastify/pull/4470) |
| **FSTDEP018** | You are accessing the deprecated `request.routerMethod` property. | Use `request.routeOptions.method`. | [#4470](https://github.com/fastify/fastify/pull/4470) |
| **FSTDEP019** | You are accessing the deprecated `reply.context` property. | Use `reply.routeOptions.config` or `reply.routeOptions.schema`. | [#5032](https://github.com/fastify/fastify/pull/5032) [#5084](https://github.com/fastify/fastify/pull/5084) |
