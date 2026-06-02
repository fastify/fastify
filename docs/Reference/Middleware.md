<h1 align="center">Fastify</h1>

## Middleware

As of Fastify v3.0.0, middleware is not supported out of the box and requires
an external plugin such as
[`@fastify/express`](https://github.com/fastify/fastify-express) or
[`@fastify/middie`](https://github.com/fastify/middie).

The following example registers the `@fastify/express` plugin and uses Express
middleware:

```js
await fastify.register(require('@fastify/express'))
fastify.use(require('cors')())
fastify.use(require('dns-prefetch-control')())
fastify.use(require('frameguard')())
fastify.use(require('hsts')())
fastify.use(require('ienoopen')())
fastify.use(require('x-xss-protection')())
```

[`@fastify/middie`](https://github.com/fastify/middie) can also be used, which
provides support for simple Express-style middleware with improved performance:

```js
await fastify.register(require('@fastify/middie'))
fastify.use(require('cors')())
```

Middleware can be encapsulated using `register`, which controls where it runs,
as explained in the [Plugins Guide](../Guides/Plugins-Guide.md).

This is because Fastify wraps the incoming Node.js `req` and `res` objects into
[Request](./Request.md#request) and [Reply](./Reply.md#reply) instances after
the middleware phase. As a result, Fastify middleware does not expose the `send`
method or other methods specific to the Fastify [Reply](./Reply.md#reply)
instance. To create middleware, use the Node.js `req` and `res` objects.
Alternatively, use the `preHandler` hook, which has access to the Fastify
[Request](./Request.md#request) and [Reply](./Reply.md#reply) instances. For
more information, see [Hooks](./Hooks.md).

### Restrict Middleware Execution to Certain Paths
<a id="restrict-usage"></a>

To restrict middleware to specific paths, pass the path as the first argument to
`use`.

> ℹ️ Note:
> This does not support routes with parameters
> (e.g., `/user/:id/comments`). Wildcards are not supported in multiple paths.

```js
const path = require('node:path')
const serveStatic = require('serve-static')

// Single path
fastify.use('/css', serveStatic(path.join(__dirname, '/assets')))

// Wildcard path
fastify.use('/css/(.*)', serveStatic(path.join(__dirname, '/assets')))

// Multiple paths
fastify.use(['/css', '/js'], serveStatic(path.join(__dirname, '/assets')))
```

### Fastify Alternatives

Fastify offers native alternatives to commonly used middleware, such as
[`@fastify/helmet`](https://github.com/fastify/fastify-helmet) for
[`helmet`](https://github.com/helmetjs/helmet),
[`@fastify/cors`](https://github.com/fastify/fastify-cors) for
[`cors`](https://github.com/expressjs/cors), and
[`@fastify/static`](https://github.com/fastify/fastify-static) for
[`serve-static`](https://github.com/expressjs/serve-static).
