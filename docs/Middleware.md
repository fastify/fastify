<h1 align="center">Fastify</h1>

## Middleware

From Fastify v3, middleware support does not come out of the box with the framework itself, but it's offered as an external plugin via [`fastify-express`](https://github.com/fastify/fastify-express) and [`middie`](https://github.com/fastify/middie).

If you need to use an express style middleware you can use one of the two plugins above:

```js
await fastify.register(require('fastify-express'))
fastify.use(require('cors')())
fastify.use(require('dns-prefetch-control')())
fastify.use(require('frameguard')())
fastify.use(require('hsts')())
fastify.use(require('ienoopen')())
fastify.use(require('x-xss-protection')())
```

You can also use [`middie`](https://github.com/fastify/middie), which provides support for simple Express-style middlewares but with improved performances:

```js
await fastify.register(require('middie'))
fastify.use(require('cors')())
```

### Alternativies

Fastify offers some alternatives to the most commonly used middlewares, such as [`fastify-helmet`](https://github.com/fastify/fastify-helmet) in case of [`helmet`](https://github.com/helmetjs/helmet), [`fastify-cors`](https://github.com/fastify/fastify-cors) for [`cors`](https://github.com/expressjs/cors) and [`fastify-static`](https://github.com/fastify/fastify-static) for [`serve-static`](https://github.com/expressjs/serve-static).
