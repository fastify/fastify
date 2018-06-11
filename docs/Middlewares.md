<h1 align="center">Fastify</h1>

## Middlewares

Fastify provides out of the box an asynchronous [middleware engine](https://github.com/fastify/middie) compatible with [Express](https://expressjs.com/) and [Restify](http://restify.com/) middlewares.

_If you need a visual feedback to understand when the middlewares are executed take a look to the [lifecycle](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md) page._

Fastify middlewares don't support the full syntax `middleware(err, req, res, next)`, because error handling is done inside Fastify.
Furthermore methods added by Express and Restify to the enhanced versions of `req` and `res` are not supported in Fastify middlewares.

Also, if you are using a middleware that bundles different, smaller middlewares, such as [_helmet_](https://helmetjs.github.io/), we recommend to use the single modules to get better performances.

```js
fastify.use(require('cors')())
fastify.use(require('dns-prefetch-control')())
fastify.use(require('frameguard')())
fastify.use(require('hide-powered-by')())
fastify.use(require('hsts')())
fastify.use(require('ienoopen')())
fastify.use(require('x-xss-protection')())
```

or, in the specific case of _helmet_, you can use the [_fastify-helmet_](https://github.com/fastify/fastify-helmet) [plugin](Plugins.md), which is an optimized helmet integration for fastify:

```js
const fastify = require('fastify')()
const helmet = require('fastify-helmet')

fastify.register(helmet)
```

Remember that middlewares can be encapsulated, this means that you can decide where your middlewares should run by using `register` as explained in the [plugins guide](https://github.com/fastify/fastify/blob/master/docs/Plugins-Guide.md).

Fastify middlewares also do not expose the `send` method or other methods specific to the Fastify [Reply]('./Reply.md' 'Reply') instance. This is because Fastify wraps the incoming `req` and `res` Node instances using the [Request](./Request.md 'Request') and [Reply](./Reply.md 'Reply') objects internally, but this is done after the middlewares phase. If you need to create a middleware you have to use the Node `req` and `res` instances. Otherwise, you can use the `preHandler` hook that has the [Request](./Request.md 'Request') and [Reply](./Reply.md 'Reply') Fastify instances. For more information, see [Hooks](./Hooks.md 'Hooks').

<a name="restrict-usage"></a>

#### Restrict middleware execution to a certain path(s)

If you need to run a middleware only under certain path(s), just pass the path as first parameter to `use` and you are done!

_Note that this does not support routes with parameters, (eg: `/user/:id/comments`) and wildcard is not supported in multiple paths._

```js
const path = require('path')
const serveStatic = require('serve-static')

// Single path
fastify.use('/css', serveStatic(path.join(__dirname, '/assets')))

// Wildcard path
fastify.use('/css/*', serveStatic(path.join(__dirname, '/assets')))

// Multiple paths
fastify.use(['/css', '/js'], serveStatic(path.join(__dirname, '/assets')))
```
