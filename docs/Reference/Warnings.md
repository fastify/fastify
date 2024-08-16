
<h1 align="center">Fastify</h1>

**Table of contents**
- [Warnings](#warnings)
  - [Warnings In Fastify](#warnings-in-fastify)
  - [Fastify Warning Codes](#fastify-warning-codes)
    - [FSTWRN001](#FSTWRN001)
    - [FSTWRN002](#FSTWRN002)
  - [Fastify Deprecation Codes](#fastify-deprecation-codes)


## Warnings

### Warnings In Fastify

Fastify utilizes Node.js's [warning event](https://nodejs.org/api/process.html#event-warning)
API to notify users of deprecated features and known coding mistakes. Fastify's
warnings are recognizable by the `FSTWRN` and `FSTDEP` prefixes on warning
code. When encountering such a warning, it is highly recommended that the
cause of the warning be determined through use of the
[`--trace-warnings`](https://nodejs.org/api/cli.html#--trace-warnings) and
[`--trace-deprecation`](https://nodejs.org/api/cli.html#--trace-deprecation)
flags. These will produce stack traces pointing out where the issue occurs
in the application's code. Issues opened about warnings without including
this information may be closed due to lack of information.

In addition to tracing, warnings can also be disabled. It is not recommended to
disable warnings as a matter of course, but if necessary, they can be disabled
by using any of the following methods:

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
| <a id="FSTWRN001">FSTWRN001</a> | The specified schema for a route is missing. This may indicate the schema is not well specified. | Check the schema for the route. | [#4647](https://github.com/fastify/fastify/pull/4647) |
| <a id="FSTWRN002">FSTWRN002</a> | The %s plugin being registered mixes async and callback styles, which will result in an error in `fastify@5`. | Do not mix async and callback style. | [#5139](https://github.com/fastify/fastify/pull/5139) |


### Fastify Deprecation Codes

Deprecation codes are further supported by the Node.js CLI options:

- [--no-deprecation](https://nodejs.org/api/cli.html#--no-deprecation)
- [--throw-deprecation](https://nodejs.org/api/cli.html#--throw-deprecation)
- [--trace-deprecation](https://nodejs.org/api/cli.html#--trace-deprecation)


| Code | Description | How to solve | Discussion |
| ---- | ----------- | ------------ | ---------- |
