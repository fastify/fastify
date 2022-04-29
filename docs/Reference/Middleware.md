<h1 align="center">Fastify</h1>

## Middleware

Starting with Fastify v3.0.0, middleware is not supported out of the box and
requires an external plugin such as
[`@fastify/express`](https://github.com/fastify/fastify-express) or
[`middie`](https://github.com/fastify/middie).


An example of registering the
[`@fastify/express`](https://github.com/fastify/fastify-express) plugin to `use`
Express middleware:

```js
await fastify.register(require('@fastify/express'))
fastify.use(require('cors')())
fastify.use(require('dns-prefetch-control')())
fastify.use(require('frameguard')())
fastify.use(require('hsts')())
fastify.use(require('ienoopen')())
fastify.use(require('x-xss-protection')())
```

You can also use [`middie`](https://github.com/fastify/middie), which provides
support for simple Express-style middleware but with improved performance:

```js
await fastify.register(require('middie'))
fastify.use(require('cors')())
```

Remember that middleware can be encapsulated; this means that you can decide
where your middleware should run by using `register` as explained in the
[plugins guide](../Guides/Plugins-Guide.md).

Fastify middleware do not expose the `send` method or other methods specific to
the Fastify [Reply](./Reply.md#reply) instance. This is because Fastify wraps
the incoming `req` and `res` Node instances using the
[Request](./Request.md#request) and [Reply](./Reply.md#reply) objects
internally, but this is done after the middleware phase. If you need to create
middleware, you have to use the Node `req` and `res` instances. Otherwise, you
can use the `preHandler` hook that already has the
[Request](./Request.md#request) and [Reply](./Reply.md#reply) Fastify instances.
For more information, see [Hooks](./Hooks.md#hooks).

#### Restrict middleware execution to certain paths
<a id="restrict-usage"></a>

If you need to only run middleware under certain paths, just pass the path as
the first parameter to `use` and you are done!

*Note that this does not support routes with parameters, (e.g.
`/user/:id/comments`) and wildcards are not supported in multiple paths.*

```js
const path = require('path')
const serveStatic = require('serve-static')

// Single path
fastify.use('/css', serveStatic(path.join(__dirname, '/assets')))

// Wildcard path
fastify.use('/css/(.*)', serveStatic(path.join(__dirname, '/assets')))

// Multiple paths
fastify.use(['/css', '/js'], serveStatic(path.join(__dirname, '/assets')))
```

### Alternatives

Fastify offers some alternatives to the most commonly used middleware, such as
[`@fastify/helmet`](https://github.com/fastify/fastify-helmet) in case of
[`helmet`](https://github.com/helmetjs/helmet),
[`@fastify/cors`](https://github.com/fastify/fastify-cors) for
[`cors`](https://github.com/expressjs/cors), and
[`@fastify/static`](https://github.com/fastify/fastify-static) for
[`serve-static`](https://github.com/expressjs/serve-static).
