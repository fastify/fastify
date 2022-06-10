# V4 Migration Guide

This guide is intended to help with migration from Fastify v3 to v4.

Before migrating to v4, please ensure that you have fixed all deprecation
warnings from v3. All v3 deprecations have been removed and they will no longer
work after upgrading.

## Breaking Changes

### Deprecation of `app.use()`

Starting this version of Fastify, we have deprecated the use of `app.use()`. We
have decided not to support the use of middlewares. Both
[`@fastify/middie`](https://github.com/fastify/middie) and
[`@fastify/express`](https://github.com/fastify/fastify-express) will still be
there and maintained. Use Fastify's [hooks](./Reference/Hooks.md) instead.

## Non Breaking Changes

### Change of schema for multiple types


Since Fastiy v4 has upgraded to Ajv v8. The "type" keywords with multiple types
(other than with "null") are prohibited. Read more
['here'](https://ajv.js.org/strict-mode.html#strict-types)

You may encounter a console warning such as

```
strict mode: use allowUnionTypes to allow union type keyword at "#/properties/image" (strictTypes)
```
So schemas like below will need to be changed from
```
type: 'object',
properties: {
  api_key: { type: 'string' },
  image: { type: ['object', 'array'] }
  }
}
```
to

```
type: 'object',
properties: {
  api_key: { type: 'string' },
  image: {
    anyOf: [
      { type: 'array' },
      { type: 'object' }
    ]
  }
}
```
