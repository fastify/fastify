
<h1 align="center">Fastify</h1>

**Table of contents**
- [Warnings](#warnings)
  - [Warnings In Fastify](#warnings-in-fastify)
  - [Fastify Warning Codes](#fastify-warning-codes)
    - [FSTWRN001](#FSTWRN001)
    - [FSTWRN003](#FSTWRN003)
    - [FSTWRN004](#FSTWRN004)
  - [Fastify Deprecation Codes](#fastify-deprecation-codes)
    - [FSTDEP022](#FSTDEP022)
    - [FSTDEP023](#FSTDEP023)
    - [FSTDEP024](#FSTDEP024)

## Warnings

### Warnings In Fastify

Fastify uses the Node.js [warning event](https://nodejs.org/api/process.html#event-warning)
API to notify users of deprecated features and coding mistakes. Fastify's
warnings are recognizable by the `FSTWRN` and `FSTDEP` prefixes. When
encountering such a warning, it is highly recommended to determine the cause
using the [`--trace-warnings`](https://nodejs.org/api/cli.html#trace-warnings)
and [`--trace-deprecation`](https://nodejs.org/api/cli.html#trace-deprecation)
flags. These produce stack traces pointing to where the issue occurs in the
application's code. Issues opened about warnings without this information will
be closed.

Warnings should be resolved rather than suppressed. If suppression is necessary,
prefer disabling a single known warning so unrelated warnings remain visible.

Node.js 21.3.0 introduced
[`--disable-warning`](https://nodejs.org/api/cli.html#--disable-warningcode-or-type),
which accepts a warning code or type. For example, the following command
suppresses `FSTWRN004`:

```sh
node --disable-warning=FSTWRN004 app.js
```

All other process warnings remain enabled. The option can also be provided
through `NODE_OPTIONS`:

```sh
NODE_OPTIONS='--disable-warning=FSTWRN004' node app.js
```

> ⚠ Warning:
> Node.js marks `--disable-warning` as
> [Stability 1.1 - Active development](https://nodejs.org/api/documentation.html#stability-index).
> Experimental features are not covered by semantic versioning and may change
> or be removed in a future release.

To suppress every process warning instead, use one of the following commands:

- `NODE_NO_WARNINGS=1 node app.js`
- `node --no-warnings app.js`
- `NODE_OPTIONS='--no-warnings' node app.js`

Disabling all warnings can hide important problems and cause unexpected
behavior. For more information, see
[Node's documentation](https://nodejs.org/api/cli.html).

### Fastify Warning Codes

| Code | Description | How to solve | Discussion |
| ---- | ----------- | ------------ | ---------- |
| <a id="FSTWRN001">FSTWRN001</a> | The specified schema for a route is missing. This may indicate the schema is not well specified. | Check the schema for the route. | [#4647](https://github.com/fastify/fastify/pull/4647) |
| <a id="FSTWRN003">FSTWRN003</a> | The `%s` plugin mixes async and callback styles, which may lead to unhandled rejections. | Do not mix async and callback style. | [#6011](https://github.com/fastify/fastify/pull/6011) |
| <a id="FSTWRN004">FSTWRN004</a> | An `errorHandler` is being overridden in the same scope, which can lead to subtle bugs. | Avoid calling `setErrorHandler` more than once in the same scope. For more information, see [Server documentation](https://fastify.dev/docs/latest/Reference/Server/#allowerrorhandleroverride). | [#6104](https://github.com/fastify/fastify/pull/6104) |


### Fastify Deprecation Codes

Deprecation codes are supported by the Node.js CLI options:

- [--no-deprecation](https://nodejs.org/api/cli.html#no-deprecation)
- [--throw-deprecation](https://nodejs.org/api/cli.html#throw-deprecation)
- [--trace-deprecation](https://nodejs.org/api/cli.html#trace-deprecation)


| Code | Description | How to solve | Discussion |
| ---- | ----------- | ------------ | ---------- |
| <a id="FSTDEP022">FSTDEP022</a> | You are trying to access the deprecated router options on top option properties. | Use `options.routerOptions`. | [#5985](https://github.com/fastify/fastify/pull/5985)
| <a id="FSTDEP023">FSTDEP023</a> | `disableRequestLogging` top-level option is deprecated. | Pass a `LogController` instance via the `logController` option with `disableRequestLogging` in its constructor instead. |
| <a id="FSTDEP024">FSTDEP024</a> | `requestIdLogLabel` top-level option is deprecated. | Pass a `LogController` instance via the `logController` option with `requestIdLogLabel` in its constructor instead. |
