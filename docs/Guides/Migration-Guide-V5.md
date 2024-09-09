# V5 Migration Guide

This guide is intended to help with migration from Fastify v4 to v5.

Before migrating to v5, please ensure that you have fixed all deprecation
warnings from v4. All v4 deprecations have been removed and they will no longer
work after upgrading.

## Long Term Support Cycle

Fastify v5 will only support Node.js v20+. If you are using an older version of
Node.js, you will need to upgrade to a newer version to use Fastify v5.

Fastify v4 is still supported until June 30, 2025. If you are unable to upgrade, you can
consider buying an end-of-life support plan from HeroDevs.

### Why Node.js v20?

Fastify v5 will only support Node.js v20+ because it has significant differences compared to v18, such as
better support for `node:test`. This allows us to provide a better developer experience and streamline
maintenance.

Node.js v18 will exit Long Term Support on April 30, 2025, so you should be planning to upgrade to v20 anyway.

## Breaking Changes

### Full JSON Schema is now required for `querystring` schema

Starting with v5, Fastify will require a full JSON schema for the `querystring`
schema. This means that you will need to provide a full JSON schema for the
`querystring` schema, including the `type` property.

```js
// v4
fastify.get('/route', {
  schema: {
    querystring: {
      name: { type: 'string' }
    }
  }
}, (req, reply) => {
  reply.send({ hello: req.query.name });
});
```

```js
// v5
fastify.get('/route', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      required: ['name']
    }
  }
}, (req, reply) => {
  reply.send({ hello: req.query.name });
});
```

This change helps with integration of other tools, such as
[`@fastify/swagger`](https://github.com/fastify/fastify-swagger).

### `useSemicolonDelimiter` false by default

Starting with v5, Fastify instances will no longer default to supporting the use
of semicolon delimiters in the query string as they did in v4.
This is due to it being non-standard
behavior and not adhering to [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986#section-3.4).

If you still wish to use semicolons as delimiters, you can do so by
setting `useSemicolonDelimiter: true` in the server configuration.

```js
const fastify = require('fastify')({
  useSemicolonDelimiter: true
});
```

### The parameters object no longer has a prototype

In v4, the `parameters` object had a prototype. This is no longer the case in v5.
This means that you can no longer access properties inherited from `Object` on the `parameters` object,
such as `toString` or `hasOwnProperty`.

```js
// v4
fastify.get('/route', (req, reply) => {
  console.log(req.params.hasOwnProperty('name'));
  return { hello: req.params.name };
});
```

```js
// v5
fastify.get('/route', (req, reply) => {
  console.log(Object.hasOwn(req.params, 'name'));
  return { hello: req.params.name };
});
```

This increases the security of the application by hardening against prototype pollution attacks.

### Type Providers now differentiate between validator and serializer schemas

In v4, the type providers had the same types for both validation and serialization.
In v5, the type providers have been split into two separate types: `ValidatorSchema` and `SerializerSchema`.

[`@fastify/type-provider-json-schema-to-ts`](https://github.com/fastify/fastify-type-provider-json-schema-to-ts)
and
[`@fastify/type-provider-typebox`](https://github.com/fastify/fastify-type-provider-typebox)
have already been updated: upgrade to the latest version to get the new types.
If you are using a custom type provider, you will need to modify it like
the following:

```
--- a/index.ts
+++ b/index.ts
@@ -11,7 +11,8 @@ import {
 import { FromSchema, FromSchemaDefaultOptions, FromSchemaOptions, JSONSchema } from 'json-schema-to-ts'
 
 export interface JsonSchemaToTsProvider<Options extends FromSchemaOptions = FromSchemaDefaultOptions> extends FastifyTypeProvider {
-  output: this['input'] extends JSONSchema ? FromSchema<this['input'], Options> : unknown;
+  validator: this['schema'] extends JSONSchema ? FromSchema<this['schema'], Options> : unknown;
+  serializer: this['schema'] extends JSONSchema ? FromSchema<this['schema'], Options> : unknown;
 }
 ```

### Changes to the .listen() method

The have removed the variable argument signature from the `.listen()` method. This means that you can no longer call `.listen()` with a variable number of arguments.

```js
// v4
fastify.listen(8000)
```

Will become:

```js
// v5
fastify.listen({ port: 8000 })
```

This was already deprecated in v4 as `FSTDEP011`, so you should have already updated your code to use the new signature.

### Direct return of trailers has been removed

In v4, you could directly return trailers from a handler. This is no longer possible in v5.

```js
// v4
fastify.get('/route', (req, reply) => {
  reply.trailer('ETag', function (reply, payload) {
    return 'custom-etag'
  })
  reply.send('')
});
```

```js
// v5
fastify.get('/route', (req, reply) => {
  reply.trailer('ETag', async function (reply, payload) {
    return 'custom-etag'
  })
  reply.send('')
});
```

A callback could also be used.
This was already deprecated in v4 as `FSTDEP013`,
so you should have already updated your code to use the new signature.

### Streamlined access to route definition

Remove all deprecation that related to accessing the route definition
(`TSFSTDEP012, FSTDEP015, FSTDEP016, FSTDEP017, FSTDEP018, FSTDEP019`).
It can now be accessed via `request.routeOptions`.

| Code | Description | How to solve | Discussion |
| ---- | ----------- | ------------ | ---------- |
| FSTDEP012 | You are trying to access the deprecated `request.context` property. | Use `request.routeOptions.config` or `request.routeOptions.schema`. | [#4216](https://github.com/fastify/fastify/pull/4216) [#5084](https://github.com/fastify/fastify/pull/5084) | | FSTDEP015</a> | You are accessing the deprecated `request.routeSchema` property. | Use `request.routeOptions.schema`. | [#4470](https://github.com/fastify/fastify/pull/4470) |
| FSTDEP016 | You are accessing the deprecated `request.routeConfig` property. | Use `request.routeOptions.config`. | [#4470](https://github.com/fastify/fastify/pull/4470) |
| FSTDEP017 | You are accessing the deprecated `request.routerPath` property. | Use `request.routeOptions.url`. | [#4470](https://github.com/fastify/fastify/pull/4470) |
| FSTDEP018 | You are accessing the deprecated `request.routerMethod` property. | Use `request.routeOptions.method`. | [#4470](https://github.com/fastify/fastify/pull/4470) |
| FSTDEP019 | You are accessing the deprecated `reply.context` property. | Use `reply.routeOptions.config` or `reply.routeOptions.schema`. | [#5032](https://github.com/fastify/fastify/pull/5032) [#5084](https://github.com/fastify/fastify/pull/5084) |

See [#5616](https://github.com/fastify/fastify/pull/5616) for more information.

### `reply.redirect()` has a new signature

The `reply.redirect()` method has a new signature: `reply.redirect(url: string, code?: number)`.

```js
// v4
reply.redirect(301, '/new-route')
```

Change it to:

```js
// v5
reply.redirect('/new-route', 301)
```

This was already deprecated in v4 as `FSTDEP021`, so you should have already updated your code to use the new signature.


### Modifying `reply.sent` is now forbidden

In v4, you could modify the `reply.sent` property to prevent the response from being sent.
This is no longer possible in v5, use `reply.hijack()` instead.

```js
// v4
fastify.get('/route', (req, reply) => {
  reply.sent = true;
  reply.raw.end('hello');
});
```

Change it to:

```js
// v5
fastify.get('/route', (req, reply) => {
  reply.hijack();
  reply.raw.end('hello');
});
```

This was already deprecated in v4 as `FSTDEP010`, so you should have already updated your code to use the new signature.

### Constraints for route versioning signature changes

We changed the signature for route versioning constraints. The `version` and `versioning` options have been removed and you should use the `constraints` option instead.

| Code | Description | How to solve | Discussion |
| ---- | ----------- | ------------ | ---------- |
| FSTDEP008 | You are using route constraints via the route `{version: "..."}` option.  |  Use `{constraints: {version: "..."}}` option.  | [#2682](https://github.com/fastify/fastify/pull/2682) |
| FSTDEP009 | You are using a custom route versioning strategy via the server `{versioning: "..."}` option. |  Use `{constraints: {version: "..."}}` option.  | [#2682](https://github.com/fastify/fastify/pull/2682) |

### `exposeHeadRoutes: false` is now required to disable automatic `HEAD` routes

Fastify automatically registers a `HEAD` route for every `GET` route.
You know must explicitly set `exposeHeadRoutes` to `false`.

```js
// v4

fastify.head('/route', (req, reply) => {
  // ...
});

fastify.get('/route', {
    
}, (req, reply) => {
  reply.send({ hello: 'world' });
});
```

```js
// v5

fastify.head('/route', (req, reply) => {
  // ...
});

fastify.get('/route', {
  exposeHeadRoutes: false
}, (req, reply) => {
  reply.send({ hello: 'world' });
});

```

This was changed in [#2700](https://github.com/fastify/fastify/pull/2700), and the old behavior was deprecated in v4 as `FSTDEP007`.

### Removed `request.connection`

The `request.connection` property has been removed in v5. You should use `request.socket` instead.

```js
// v4
fastify.get('/route', (req, reply) => {
  console.log(req.connection.remoteAddress);
  return { hello: 'world' };
});
```

```js
// v5
fastify.get('/route', (req, reply) => {
  console.log(req.socket.remoteAddress);
  return { hello: 'world' };
});
```

This was already deprecated in v4 as `FSTDEP05`, so you should have already updated your code to use the new signature.

### `reply.getResponseTime()` has been removed, use `reply.elapsedTime` instead

The `reply.getResponseTime()` method has been removed in v5. You should use `reply.elapsedTime` instead.

```js
// v4
fastify.get('/route', (req, reply) => {
  console.log(reply.getResponseTime());
  return { hello: 'world' };
});
```

```js
// v5
fastify.get('/route', (req, reply) => {
  console.log(reply.elapsedTime);
  return { hello: 'world' };
});
```

This was already deprecated in v4 as `FSTDEP20`, so you should have already updated your code to use the new signature.

### `fastify.hasRoute()` now matches the behavior of `find-my-way`

The `fastify.hasRoute()` method now matches the behavior of `find-my-way` and requires the route definition to be
passed as it is defined in the route.

```js
// v4
fastify.get('/example/:file(^\\d+).png', function (request, reply) { })

console.log(fastify.hasRoute({
  method: 'GET', 
  url: '/example/12345.png'
)); // true
```

```js
// v5

fastify.get('/example/:file(^\\d+).png', function (request, reply) { })

console.log(fastify.hasRoute({
  method: 'GET', 
  url: '/example/:file(^\\d+).png'
)); // true
```
