# Middlewares

Fastify provides out of the box an asynchronous [middleware engine](https://github.com/fastify/middie) compatible with [Express](https://expressjs.com/) and [Restify](http://restify.com/) middlewares.

*If you need a visual feedback to understand when the middlewares are executed take a look to the [lifecycle](/docs/Lifecycle.md) page.*

Fastify middlewares don't support the full syntax `middleware(err, req, res, next)`, because error handling is done inside Fastify.

Also, if you are using Middlewares that bundles different small middlewares, such as [*helmet*](https://helmetjs.github.io/), we recommend to use the single modules to get better performances.

```js
fastify.use(require('cors')())
fastify.use(require('dns-prefetch-control')())
fastify.use(require('frameguard')())
fastify.use(require('hide-powered-by')())
fastify.use(require('hsts')())
fastify.use(require('ienoopen')())
fastify.use(require('x-xss-protection')())
```

or, in the specific case of *helmet*, you can use the [*fastify-helmet*](https://github.com/fastify/fastify-helmet) [plugin](/docs/Plugins.md), which is an optimized helmet integration for fastify:

```js
const fastify = require('fastify')()
const helmet = require('fastify-helmet')

fastify.register(helmet)
```


<a name="restrict-usage"></a>
#### Restrict middleware execution to a certain path(s)
If you need to run a middleware only under certain path(s), just pass the path as first parameter to `use` and you are done!

*Note that this does not support routes with parameters, (eg: `/user/:id/comments`) and wildcard is not supported in multiple paths.*


```js
const serveStatic = require('serve-static')

// Single path
fastify.use('/css', serveStatic('/assets'))

// Wildcard path
fastify.use('/css/*', serveStatic('/assets'))

// Multiple paths
fastify.use(['/css', '/js'], serveStatic('/assets'))
```
