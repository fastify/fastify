# V3 Migration Guide

This guide is aimed to help migrating from Fastify v2 to v3.

Before beginning please ensure that any deprecation warnings from v2 are fixed as we have removed all deprecated features and they will no longer work after upgrading. (#1750)

## Breaking changes

### Changed middleware support (#2014)

From Fastify v3, middleware support does not come out of the box with the framework itself.

If you use Express middleware in your application, please install and register the [`fastify-express`](https://github.com/fastify/fastify-express) or [`middie`](https://github.com/fastify/middie) plugin before doing so.

**v2:**

```js
fastify.use(require("cors")());
```

**v3:**

```js
await fastify.register(require("fastify-express"));
fastify.use(require("cors")());
```

### Changed schema substitution (#2023)

We have dropped support for non-standard `replace-way` shared schema substitution and replaced it with standard compliant `$ref-way` references.

**v2:**

```js
const schema = {
  body: "schemaId#"
};
fastify.route({ method, url, schema, handler });
```

**v3:**

```js
const schema = {
  body: {
    $ref: "schemaId#"
  }
};
fastify.route({ method, url, schema, handler });
```

### Changed schema validation options (#2023)

We have replaced `setSchemaCompiler` and `setSchemaResolver` options with `setValidatorCompiler` to enable future tooling improvements.

**v2:**

```js
const fastify = Fastify();
const ajv = new AJV();
ajv.addSchema(fastClone(schemaA));
ajv.addSchema(fastClone(schemaB));

fastify.setSchemaCompiler(schema => ajv.compile(schema));
fastify.setSchemaResolver(ref => ajv.getSchema(ref).schema);
```

**v3:**

```js
const fastify = Fastify();
const ajv = new AJV();
ajv.addSchema(schemaA);
ajv.addSchema(schemaB);

fastify.setValidatorCompiler((method, url, httpPart, schema) =>
  ajv.compile(schema)
);
```

### Changed hooks behaviour (#2004)

From Fastify v3, the behavior of `onRoute` and `onRegister` hooks will change slightly in order to support hook encapsulation.

- `onRoute` - The hook will be called asynchronously, in v1/v2 it's called as soon as a route is registered. This means that if you want to use it, you should register this hook as soon as possible in your code.
- `onRegister` - Same as the onRoute hook, the only difference is that now the very first call will no longer be the framework itself, but the first registered plugin

### Changed TypeScript support

TODO: Our types have been completely rewritten

## Further additions and improvements

- Hooks now have consistent context irregardless of how they are registered (#2005)
- Deprecated `request.req` and `reply.res` for [`request.raw`](Request.md) and [`reply.raw`](Reply.md) (#2008)
- Removed `modifyCoreObjects` option (#2015)
- [Serializers](Logging.md) now receive Fastify request and response objects instead of native ones (#2017)
- Added [`connectionTimeout`](Server.md#factory-connection-timeout) option (#2086)
- Added [`keepAliveTimeout`](Server.md#factory-keep-alive-timeout) option (#2086)
- Added async-await support for [plugins](Plugins.md#async-await) (#2093)
