# V3 Migration Guide

This guide is aimed to help migration from Fastify v2 to v3.

Before beginning please ensure that any deprecation warnings from v2 are fixed as we have removed all deprecated features and they will no longer work after upgrading. ([#1750](https://github.com/fastify/fastify/pull/1750))

## Breaking changes

### Changed middleware support ([#2014](https://github.com/fastify/fastify/pull/2014))

From Fastify v3, middleware support does not come out of the box with the framework itself.

If you use Express middleware in your application, please install and register the [`fastify-express`](https://github.com/fastify/fastify-express) or [`middie`](https://github.com/fastify/middie) plugin before doing so.

**v2:**

```js
fastify.use(require('cors')());
```

**v3:**

```js
await fastify.register(require('fastify-express'));
fastify.use(require('cors')());
```

### Changed logging serialization ([#2017](https://github.com/fastify/fastify/pull/2017))

We have updated our logging [Serializers](./Logging.md) to now receive Fastify [`Request`](./Request.md) and [`Reply`](./Reply.md) objects instead of native ones.

If you have created custom serializers they will need updating if they expect properties that aren't exposed by the Fastify objects themselves.

**v2:**

```js
const fastify = require('fastify')({
  logger: {
    serializers: {
      res(res) {
        return {
          statusCode: res.statusCode,
          customProp: res.customProp
        };
      }
    }
  }
});
```

**v3:**

```js
const fastify = require('fastify')({
  logger: {
    serializers: {
      res(reply) {
        return {
          statusCode: reply.statusCode, // No change required
          customProp: reply.raw.customProp // Log custom property from res object
        };
      }
    }
  }
});
```

### Changed schema substitution ([#2023](https://github.com/fastify/fastify/pull/2023))

We have dropped support for non-standard `replace-way` shared schema substitution and replaced it with standard compliant JSON Schema `$ref` based substitution. To better understand this change read [Validation and Serialization in Fastify v3](https://dev.to/eomm/validation-and-serialization-in-fastify-v3-2e8l).

**v2:**

```js
const schema = {
  body: 'schemaId#'
};
fastify.route({ method, url, schema, handler });
```

**v3:**

```js
const schema = {
  body: {
    $ref: 'schemaId#'
  }
};
fastify.route({ method, url, schema, handler });
```

### Changed schema validation options ([#2023](https://github.com/fastify/fastify/pull/2023))

We have replaced `setSchemaCompiler` and `setSchemaResolver` options with `setValidatorCompiler` to enable future tooling improvements. To deepen this change [read the article](https://dev.to/eomm/validation-and-serialization-in-fastify-v3-2e8l).

**v2:**

```js
const fastify = Fastify();
const ajv = new AJV();
ajv.addSchema(schemaA);
ajv.addSchema(schemaB);

fastify.setSchemaCompiler(schema => ajv.compile(schema));
fastify.setSchemaResolver(ref => ajv.getSchema(ref).schema);
```

**v3:**

```js
const fastify = Fastify();
const ajv = new AJV();
ajv.addSchema(schemaA);
ajv.addSchema(schemaB);

fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => 
  ajv.compile(schema)
);
```

### Changed hooks behaviour ([#2004](https://github.com/fastify/fastify/pull/2004))

From Fastify v3, the behavior of `onRoute` and `onRegister` hooks will change slightly in order to support hook encapsulation.

- `onRoute` - The hook will be called asynchronously, in v1/v2 it's called as soon as a route is registered. This means that if you want to use it, you should register this hook as soon as possible in your code.
- `onRegister` - Same as the onRoute hook, the only difference is that now the very first call will no longer be the framework itself, but the first registered plugin

### Changed TypeScript support

The type system was changed in Fastify version 3. The new type system introduces generic constraining and defaulting, plus a new way to define schema types such as a request body, querystring, and more!

**v2:**

```ts
interface PingQuerystring {
  foo?: number;
}

interface PingParams {
  bar?: string;
}

interface PingHeaders {
  a?: string;
}

interface PingBody {
  baz?: string;
}

server.get<PingQuerystring, PingParams, PingHeaders, PingBody>(
  '/ping/:bar',
  opts,
  (request, reply) => {
    console.log(request.query); // This is of type `PingQuerystring`
    console.log(request.params); // This is of type `PingParams`
    console.log(request.headers); // This is of type `PingHeaders`
    console.log(request.body); // This is of type `PingBody`
  }
);
```

**v3:**

```ts
server.get<{
  Querystring: PingQuerystring;
  Params: PingParams;
  Headers: PingHeaders;
  Body: PingBody;
}>('/ping/:bar', opts, async (request, reply) => {
  console.log(request.query); // This is of type `PingQuerystring`
  console.log(request.params); // This is of type `PingParams`
  console.log(request.headers); // This is of type `PingHeaders`
  console.log(request.body); // This is of type `PingBody`
});
```

### Manage uncaught exception ([#2073](https://github.com/fastify/fastify/pull/2073))

In sync route handlers, if an error was thrown the server crashed by design without calling the configured `.setErrorHandler()`. This has changed and now all unexpected errors in sync and async routes are managed.

**v2:**

```js
fastify.setErrorHandler((error, request, reply) => {
  // this is NOT called
  reply.send(error)
})
fastify.get('/', (request, reply) => {
  const maybeAnArray = request.body.something ? [] : 'I am a string'
  maybeAnArray.substr() // Thrown: [].substr is not a function and crash the server
})
```

**v3:**

```js
fastify.setErrorHandler((error, request, reply) => {
  // this IS called
  reply.send(error)
})
fastify.get('/', (request, reply) => {
  const maybeAnArray = request.body.something ? [] : 'I am a string'
  maybeAnArray.substr() // Thrown: [].substr is not a function, but it is handled
})
```

## Further additions and improvements

- Hooks now have consistent context irregardless of how they are registered ([#2005](https://github.com/fastify/fastify/pull/2005))
- Deprecated `request.req` and `reply.res` for [`request.raw`](./Request.md) and [`reply.raw`](./Reply.md) ([#2008](https://github.com/fastify/fastify/pull/2008))
- Removed `modifyCoreObjects` option ([#2015](https://github.com/fastify/fastify/pull/2015))
- Added [`connectionTimeout`](./Server.md#factory-connection-timeout) option ([#2086](https://github.com/fastify/fastify/pull/2086))
- Added [`keepAliveTimeout`](./Server.md#factory-keep-alive-timeout) option ([#2086](https://github.com/fastify/fastify/pull/2086))
- Added async-await support for [plugins](./Plugins.md#async-await) ([#2093](https://github.com/fastify/fastify/pull/2093))
- Added the feature to throw object as error ([#2134](https://github.com/fastify/fastify/pull/2134))
