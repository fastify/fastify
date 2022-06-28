# V4 Migration Guide

This guide is intended to help with migration from Fastify v3 to v4.

Before migrating to v4, please ensure that you have fixed all deprecation
warnings from v3. All v3 deprecations have been removed and they will no longer
work after upgrading.

## Breaking Changes

### Error handling composition ([#3261](https://github.com/fastify/fastify/pull/3261))

When an error is thrown in a async error handler function, 
the upper-level error handler is executed if set.
If there is not a upper-level error handler, the default will 
be executed as it was previously.

```
import Fastify from 'fastify'

const fastify = Fastify()

fastify.register(async fastify => {
  fastify.setErrorHandler(async err => {
    console.log(err.message) // 'kaboom'
    throw new Error('caught')
  })
  
  fastify.get('/encapsulated', async () => {
    throw new Error('kaboom')
  })
})

fastify.setErrorHandler(async err => {
  console.log(err.message) // 'caught' 
  throw new Error('wrapped')
})

const res = await fastify.inject('/encapsulated')
console.log(res.json().message) // 'wrapped'
```

### Deprecation of `app.use()` ([#3506](https://github.com/fastify/fastify/pull/3506))

Starting this version of Fastify, we have deprecated the use of `app.use()`. We
have decided not to support the use of middlewares. Both
[`@fastify/middie`](https://github.com/fastify/middie) and
[`@fastify/express`](https://github.com/fastify/fastify-express) will still be
there and maintained. Use Fastify's [hooks](../Reference/Hooks.md) instead.

### `reply.res` moved to `reply.raw`

If you previously used the `reply.res` attribute to access the underlying Request
object you'll instead need to depend on `reply.raw`.

### Need to `return reply` to signal a "fork" of the promise chain

In some situations, like when a response is sent asynchronously or when you're
just not explicitly returning a response, you'll need to return the `reply`
argument from your router handler.

### `exposeHeadRoutes` true by default

Starting from v4, all the `GET` routes will create a sibling `HEAD` route.
You can revert this behaviour by setting the server's option `exposeHeadRoutes`
to `false`.

### Synchronous route definitions

The route registration has been made synchronous from v4.
This change was done to provide better error reporting for route definition.
As a result if you specify an `onRoute` hook in a plugin you should either:
* wrap your routes in a plugin (recommended)
* use `await register(...)`

For example refactor this:
```
fastify.register((instance, opts, done) => {
  instance.addHook('onRoute', (routeOptions) => {
    const { path, method } = routeOptions;
    console.log({ path, method });
  });
  done();
});
```
Into this:
```
await fastify.register((instance, opts, done) => {
  instance.addHook('onRoute', (routeOptions) => {
    const { path, method } = routeOptions;
    console.log({ path, method });
  });
  done();
});
```

## Non Breaking Changes

### Change of schema for multiple types


Since Fastify v4 has upgraded to Ajv v8. The "type" keywords with multiple types
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

### Add `reply.trailers` methods ([#3794](https://github.com/fastify/fastify/pull/3794))

Fastify now supports the [HTTP Trailer] response headers.


[HTTP Trailer]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Trailer
