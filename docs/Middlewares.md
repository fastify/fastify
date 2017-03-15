<h1 align="center">Fastify</h1>

## Middlewares

Fastify provides out of the box an asynchronous [middleware engine](https://github.com/fastify/middie) compatible with Express and Restify middlewares.

This does not support the full syntax `middleware(err, req, res, next)`, because error handling is done inside Fastify.

If you are using Middlewares that bundles differets small middlewares, such as *helmet*, we recommend to use the single modules to get better performances.

```js
fastify.use(require('cors')())
fastify.use(require('dns-prefetch-control')())
fastify.use(require('frameguard')())
fastify.use(require('hide-powered-by')())
fastify.use(require('hsts')())
fastify.use(require('ienoopen')())
fastify.use(require('x-xss-protection')())
```
*If you need a visual feedback to understand when the middlewares are executed take a look to the [lifecycle](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md) page.*
