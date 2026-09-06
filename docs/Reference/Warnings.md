
<h1 align="center">Fastify</h1>

**Table of contents**
- [Warnings](#warnings)
  - [Warnings In Fastify](#warnings-in-fastify)
  - [Fastify Warning Codes](#fastify-warning-codes)
    - [FSTWRN001](#FSTWRN001)
    - [FSTWRN003](#FSTWRN003)
  - [Fastify Security Codes](#fastify-security-codes)
    - [FSTSEC001](#FSTSEC001)
    - [FSTSEC002](#FSTSEC002)
  - [Fastify Deprecation Codes](#fastify-deprecation-codes)

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

Warnings can also be disabled, though it is not recommended. If necessary, use
one of the following methods:

- Set the `NODE_NO_WARNINGS` environment variable to `1`
- Pass the `--no-warnings` flag to the node process
- Set `no-warnings` in the `NODE_OPTIONS` environment variable
- Pass `--disable-warning=FSTWRN003` to disable a specific warning

For more information on disabling warnings, see [Node's documentation](https://nodejs.org/api/cli.html).

Disabling warnings is not recommended and may cause unexpected behavior.

### Fastify Warning Codes

| Code | Description | How to solve | Discussion |
| ---- | ----------- | ------------ | ---------- |
| <a id="FSTWRN001">FSTWRN001</a> | The specified schema for a route is missing. This may indicate the schema is not well specified. | Check the schema for the route. | [#4647](https://github.com/fastify/fastify/pull/4647) |
| <a id="FSTWRN003">FSTWRN003</a> | The `%s` plugin mixes async and callback styles, which may lead to unhandled rejections. | Do not mix async and callback style. | [#6011](https://github.com/fastify/fastify/pull/6011) |

### Fastify Security Codes

| Code | Description | How to solve | Discussion |
| ---- | ----------- | ------------ | ---------- |
| <a id="FSTSEC001">FSTSEC001</a> | A `RegExp` Content-Type is used that may be vulnerable to a CORS bypass, because it does not anchor the essence MIME type. | Start the `RegExp` with `^` or include `;?` so the essence MIME type is detected correctly. | [#4450](https://github.com/fastify/fastify/pull/4450) |
| <a id="FSTSEC002">FSTSEC002</a> | A headers schema references an external `$ref` (a schema registered with `addSchema`) that is not reached by header case normalization. Header names in the referenced schema keep their original case and do not match the lowercased request headers, so case-insensitive assertions such as `required` and `dependencies` may not apply. | Inline the header schema instead of referencing it with an external `$ref`. | - |

### Fastify Deprecation Codes

Deprecation codes are supported by the Node.js CLI options:

- [--no-deprecation](https://nodejs.org/api/cli.html#no-deprecation)
- [--throw-deprecation](https://nodejs.org/api/cli.html#throw-deprecation)
- [--trace-deprecation](https://nodejs.org/api/cli.html#trace-deprecation)

There are currently no active deprecation codes because the APIs deprecated in
Fastify v5 have been removed in Fastify v6.

| Code | Description | How to solve | Discussion |
| ---- | ----------- | ------------ | ---------- |
