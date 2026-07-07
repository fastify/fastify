
<h1 align="center">Fastify</h1>

**Table of contents**
- [Warnings](#warnings)
  - [Warnings In Fastify](#warnings-in-fastify)
  - [Fastify Warning Codes](#fastify-warning-codes)
    - [FSTWRN001](#FSTWRN001)
    - [FSTWRN003](#FSTWRN003)
    - [FSTWRN004](#FSTWRN004)
    - [FSTSEC001](#FSTSEC001)
  - [Fastify Deprecation Codes](#fastify-deprecation-codes)
    - [FSTDEP022](#FSTDEP022)
    - [FSTDEP023](#FSTDEP023)
    - [FSTDEP024](#FSTDEP024)

## Warnings

### Warnings In Fastify

Fastify uses a warnings manager to notify users of deprecated features,
security issues, and coding mistakes. By default, warnings are forwarded to
the Node.js [warning event](https://nodejs.org/api/process.html#event-warning).

Fastify warnings are recognizable by the `FSTWRN`, `FSTSEC`, and `FSTDEP`
prefixes. When a warning is emitted, the preferred approach is to fix the
underlying cause. If you need to customize the behavior, do it through
Fastify's warnings manager rather than by disabling all Node.js warnings for
the whole process. To configure warning behavior, see
[`configureWarnings`](./Server.md#factory-configure-warnings).

### Fastify Warning Codes

| Code | Description | How to solve | Discussion |
| ---- | ----------- | ------------ | ---------- |
| <a id="FSTWRN001">FSTWRN001</a> | The specified schema for a route is missing. This may indicate the schema is not well specified. | Check the schema for the route. | [#4647](https://github.com/fastify/fastify/pull/4647) |
| <a id="FSTWRN003">FSTWRN003</a> | The `%s` method mixes async and callback styles, which may lead to unhandled rejections. | Do not mix async and callback style. | [#6011](https://github.com/fastify/fastify/pull/6011) |
| <a id="FSTWRN004">FSTWRN004</a> | An `errorHandler` is being overridden in the same scope, which can lead to subtle bugs. | Avoid calling `setErrorHandler` more than once in the same scope. For more information, see [Server documentation](https://fastify.dev/docs/latest/Reference/Server/#allowerrorhandleroverride). | [#6104](https://github.com/fastify/fastify/pull/6104) |
| <a id="FSTSEC001">FSTSEC001</a> | A `RegExp` content type parser may be vulnerable to content type spoofing. | Start the expression with `^` or include `;?` so it properly matches the essence MIME type. | [#4450](https://github.com/fastify/fastify/pull/4450) |


### Fastify Deprecation Codes

| Code | Description | How to solve | Discussion |
| ---- | ----------- | ------------ | ---------- |
| <a id="FSTDEP022">FSTDEP022</a> | You are trying to access the deprecated router options on top option properties. | Use `options.routerOptions`. | [#5985](https://github.com/fastify/fastify/pull/5985)
| <a id="FSTDEP023">FSTDEP023</a> | `disableRequestLogging` top-level option is deprecated. | Pass a `LogController` instance via the `logController` option with `disableRequestLogging` in its constructor instead. |
| <a id="FSTDEP024">FSTDEP024</a> | `requestIdLogLabel` top-level option is deprecated. | Pass a `LogController` instance via the `logController` option with `requestIdLogLabel` in its constructor instead. |
