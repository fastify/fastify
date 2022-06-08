# V4 Migration Guide

This guide is intended to help with migration from Fastify v3 to v4.

Before migrating to v4, please ensure that you have fixed all deprecation warningx from v3.
All v3 deprecations have been removed and they will no longer work after upgrading.

## Breaking Changes

### Deprecation of `app.use()`

Starting this version of Fastify, we have deprecated the use of `app.use()`. We have decided not to support the use of middlewares. Both [`@fastify/middie`](https://github.com/fastify/middie) and [`@fastify/express`](https://github.com/fastify/fastify-express) will still be there and maintained. Use Fastify's [hooks](./Reference/Hooks.md) instead.
