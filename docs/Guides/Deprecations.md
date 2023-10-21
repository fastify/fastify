<h1 align="center">Fastify</h1>

# Deprecations

It is suggested that if you are deprecating features, 
you can send a deprecation warning: 
[example](https://github.com/fastify/process-warning/blob/master/examples/example.js)
## Suppressing warnings

It is possible to suppress warnings by utilizing one of node's built-in 
warning suppression mechanisms (on their own risk).

Warnings can be suppressed:

- by setting the `NODE_NO_WARNINGS` environment variable to `1`
- by passing the `--no-warnings` flag to the node process
- by setting 'no-warnings' in the `NODE_OPTIONS` environment variable

For more information see 
[node's documentation](https://nodejs.org/api/cli.html).

## Fastify Deprecations in Migration Guides

### V4 Deprecations ([Migration-Guide-V4](Migration-Guide-V4.md))
 - Deprecation of variadic `.listen()` signature [Notes](Migration-Guide-V4.md#deprecation-of-variadic-listen-signature)


### V3 Deprecations ([Migration-Guide-V3](Migration-Guide-V3.md))
 - `preParsing` hook behavior - 
 [#2286](https://github.com/fastify/fastify/pull/2286) - The old syntax
of Fastify v2 without payload is supported but it is deprecated.
[Notes](Migration-Guide-V3.md#changed-preparsing-hook-behavior-2286)
 - [Content Type Parser](../Reference/ContentTypeParser.md) - The old
 signatures `fn(req, [done])` or `fn(req, payload, [done])` (where `req`
 is `IncomingMessage`) are still supported but are deprecated. 
 [Notes](Migration-Guide-V3.md#changed-content-type-parser-syntax-2286)
- Deprecated `request.req` and `reply.res` for
  [`request.raw`](../Reference/Request.md) and
  [`reply.raw`](../Reference/Reply.md)
- Removed `modifyCoreObjects` option
  ([#2015](https://github.com/fastify/fastify/pull/2015))
