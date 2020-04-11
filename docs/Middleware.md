<h1 align="center">Fastify</h1>

## Middleware

Fastify provides an asynchronous [middleware engine](https://github.com/fastify/middie) out-of-the-box, which is compatible with [Express](https://expressjs.com/) and [Restify](http://restify.com/) middleware.

*For help with understanding when middleware is executed, take a look at the [lifecycle](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md) page.*

Fastify middleware don't support the full syntax `middleware(err, req, res, next)`, because error handling is done inside Fastify.
Furthermore, methods added by Express and Restify to the enhanced versions of `req` and `res` are not supported in Fastify middlewares.

Also, if you are using middleware that bundles different, smaller middleware, such as [*helmet*](https://helmetjs.github.io/), we recommend using the single modules for better performance.

```js
fastify.use(require('cors')())
fastify.use(require('dns-prefetch-control')())
fastify.use(require('frameguard')())
fastify.use(require('hide-powered-by')())
fastify.use(require('hsts')())
fastify.use(require('ienoopen')())
fastify.use(require('x-xss-protection')())
```

or, in the specific case of *helmet*, you can use the [*fastify-helmet*](https://github.com/fastify/fastify-helmet) [plugin](Plugins.md), which is an optimized helmet integration for fastify:

```js
const fastify = require('fastify')()
const helmet = require('fastify-helmet')

fastify.register(helmet)
```

Remember that middleware can be encapsulated, this means that you can decide where your middleware should run by using `register` as explained in the [plugins guide](https://github.com/fastify/fastify/blob/master/docs/Plugins-Guide.md).

Fastify middleware also do not expose the `send` method or other methods specific to the Fastify [Reply](./Reply.md#reply) instance. This is because Fastify wraps the incoming `req` and `res` Node instances using the [Request](./Request.md#request) and [Reply](./Reply.md#reply) objects internally, but this is done after the middleware phase. If you need to create middleware, you have to use the Node `req` and `res` instances. Otherwise, you can use the `preHandler` hook which already has the [Request](./Request.md#request) and [Reply](./Reply.md#reply) Fastify instances. For more information, see [Hooks](./Hooks.md#hooks).

<a name="restrict-usage"></a>
#### Restrict middleware execution to a certain path(s)
If you need to run a middleware only under certain path(s), just pass the path as first parameter to `use` and you are done!

*Note that this does not support routes with parameters, (eg: `/user/:id/comments`) and wildcards are not supported in multiple paths.*

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

<a name="express-middleware"></a>
#### Express middleware compatibility
Express modifies the prototype of the node core Request and Response objects heavily so Fastify cannot guarantee full middleware compatibility. Express specific functionality such as `res.sendFile()`, `res.send()` or `express.Router()` instances will not work with Fastify. For example, [cors](https://github.com/expressjs/cors) is compatible while [passport](https://github.com/jaredhanson/passport) is not.
