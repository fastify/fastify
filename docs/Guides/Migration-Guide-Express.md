<h1 align="center">Fastify</h1>

## Migrating from Express to Fastify

This guide helps developers coming from [Express](https://expressjs.com/)
migrate an existing application to Fastify. It maps the most common Express
patterns to their Fastify equivalents and highlights the differences you need to
be aware of along the way.

Fastify and Express share a similar mental model: you create an application
instance, register routes, and start listening. The biggest conceptual shifts
are:

+ Fastify replaces Express-style middleware with a more structured system of
  [Hooks](../Reference/Hooks.md), [Decorators](../Reference/Decorators.md), and
  [Plugins](../Reference/Plugins.md).
+ Everything in Fastify is encapsulated in a plugin, which gives you
  predictable scoping instead of a single global middleware chain.
+ Fastify uses `request` and `reply` objects that are not the raw Node.js
  `http` objects, and it favors returning values (or `async`/`await`) over
  calling `res.send()` imperatively.
+ Validation and serialization are first-class citizens driven by
  [JSON Schema](../Reference/Validation-and-Serialization.md).

> ℹ️ If you rely heavily on the Express API, the
> [`@fastify/express`](https://github.com/fastify/fastify-express) plugin lets
> you run existing Express middleware inside Fastify. It is a great tool for an
> incremental migration, but it is not recommended as a permanent solution
> because it adds overhead and re-introduces the Express request lifecycle.

### Installation
<a id="installation"></a>

Remove Express and add Fastify:

```sh
npm uninstall express
npm i fastify
```

Most of the middleware you used in Express has an official or community Fastify
plugin. See the [Ecosystem](./Ecosystem.md) page for the full list. A quick
reference of common replacements:

| Express / middleware      | Fastify equivalent                              |
| ------------------------- | ----------------------------------------------- |
| `express.json()`          | Built in (JSON body parsing is automatic)       |
| `express.urlencoded()`    | [`@fastify/formbody`][formbody]                 |
| `express.static()`        | [`@fastify/static`][static]                     |
| `cors`                    | [`@fastify/cors`][cors]                          |
| `helmet`                  | [`@fastify/helmet`][helmet]                      |
| `cookie-parser`           | [`@fastify/cookie`][cookie]                      |
| `express-session`         | [`@fastify/session`][session]                    |
| `multer`                  | [`@fastify/multipart`][multipart]                |
| `morgan`                  | Built-in [Pino](https://getpino.io) logger      |
| `express.Router()`        | [Plugins](../Reference/Plugins.md) with a prefix |
| Any Express middleware    | [`@fastify/middie`][middie] or [`@fastify/express`][express] |

[formbody]: https://github.com/fastify/fastify-formbody
[static]: https://github.com/fastify/fastify-static
[cors]: https://github.com/fastify/fastify-cors
[helmet]: https://github.com/fastify/fastify-helmet
[cookie]: https://github.com/fastify/fastify-cookie
[session]: https://github.com/fastify/session
[multipart]: https://github.com/fastify/fastify-multipart
[middie]: https://github.com/fastify/middie
[express]: https://github.com/fastify/fastify-express

### The application instance
<a id="application-instance"></a>

In Express you create an app and start listening:

```js
const express = require('express')
const app = express()

app.listen(3000, () => {
  console.log('Server listening on port 3000')
})
```

In Fastify the factory returns an instance and `listen` takes an options
object. Enabling the logger is recommended and replaces tools like `morgan`:

```js
const fastify = require('fastify')({ logger: true })

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // With logger: true the address is already logged for you
})
```

`fastify.listen` also returns a promise, so you can use `async`/`await`:

```js
const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
```

> ℹ️ By default Fastify only listens on `127.0.0.1`. To accept connections
> from any address (for example inside a container), pass
> `{ port: 3000, host: '0.0.0.0' }`.

### Routing
<a id="routing"></a>

Basic route declarations look almost identical. Express:

```js
app.get('/', (req, res) => {
  res.send('hello world')
})
```

Fastify:

```js
fastify.get('/', (request, reply) => {
  reply.send('hello world')
})
```

Fastify also supports a full-declaration route API, which is where validation,
serialization, and hooks are configured per route:

```js
fastify.route({
  method: 'GET',
  url: '/',
  handler: (request, reply) => {
    reply.send({ hello: 'world' })
  }
})
```

#### Route parameters and query strings
<a id="route-parameters"></a>

Route parameters use the same `:param` syntax and are available on
`request.params`. Query strings are parsed onto `request.query`:

```js
// Express: /user/42?active=true
app.get('/user/:id', (req, res) => {
  res.send({ id: req.params.id, active: req.query.active })
})

// Fastify
fastify.get('/user/:id', (request, reply) => {
  reply.send({ id: request.params.id, active: request.query.active })
})
```

#### Wildcards
<a id="wildcards"></a>

Express uses `*`; in Fastify a wildcard is declared as a `*` parameter and read
from `request.params['*']`:

```js
// Express
app.get('/files/*', (req, res) => { /* req.params[0] */ })

// Fastify
fastify.get('/files/*', (request, reply) => {
  reply.send(request.params['*'])
})
```

### Request and reply
<a id="request-and-reply"></a>

The Fastify `request` and `reply` objects are not the raw Node.js objects.
Common Express members map as follows:

| Express                       | Fastify                                     |
| ----------------------------- | ------------------------------------------- |
| `req.body`                    | `request.body`                              |
| `req.params`                  | `request.params`                            |
| `req.query`                   | `request.query`                             |
| `req.headers`                 | `request.headers`                           |
| `req.ip` / `req.ips`          | `request.ip` / `request.ips`                |
| `req.get('header')`           | `request.headers['header']`                 |
| `res.send(body)`              | `reply.send(body)` (or `return body`)       |
| `res.json(obj)`               | `reply.send(obj)` (JSON is the default)     |
| `res.status(code)`            | `reply.code(code)` / `reply.status(code)`   |
| `res.set('h', 'v')`           | `reply.header('h', 'v')`                    |
| `res.redirect(url)`           | `reply.redirect(url)`                       |
| `res.sendStatus(code)`        | `reply.code(code).send()`                   |
| `res.type('text/html')`       | `reply.type('text/html')`                   |

Sending JSON does not require a dedicated method. Returning an object (or
passing it to `reply.send`) serializes it as JSON automatically:

```js
// Express
app.get('/user', (req, res) => {
  res.status(200).json({ name: 'Jane' })
})

// Fastify
fastify.get('/user', (request, reply) => {
  reply.code(200).send({ name: 'Jane' })
})
```

#### Returning values and async/await
<a id="async-await"></a>

Fastify has first-class `async`/`await` support. Instead of calling
`reply.send`, you can simply return the payload from an `async` handler. Any
thrown error is routed to the error handler automatically:

```js
// Express needs a try/catch and next(err) for async errors
app.get('/user/:id', async (req, res, next) => {
  try {
    const user = await db.getUser(req.params.id)
    res.json(user)
  } catch (err) {
    next(err)
  }
})

// Fastify: return the value, throw on error
fastify.get('/user/:id', async (request, reply) => {
  const user = await db.getUser(request.params.id)
  return user
})
```

> ⚠️ Do not mix the two styles. If your handler is `async`, either `return` the
> payload or `await reply.send(...)` and then `return reply`. Returning a value
> while also calling `reply.send` can lead to unexpected behavior.

### Body parsing
<a id="body-parsing"></a>

Express requires explicit body-parsing middleware:

```js
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
```

Fastify parses `application/json` and `text/plain` out of the box, so no setup
is needed for JSON APIs. For URL-encoded forms, register
[`@fastify/formbody`](https://github.com/fastify/fastify-formbody):

```js
fastify.register(require('@fastify/formbody'))

fastify.post('/login', (request, reply) => {
  // request.body is populated from the urlencoded payload
  reply.send(request.body)
})
```

To handle other content types, add a custom parser with
`fastify.addContentTypeParser`. See
[Content-Type Parser](../Reference/ContentTypeParser.md).

### Middleware: hooks, decorators, and plugins
<a id="middleware"></a>

This is the largest conceptual difference. Express uses `app.use()` middleware
for everything. Fastify does not use a global middleware chain; instead it
offers targeted tools:

+ **Hooks** run at specific points in the
  [request/response lifecycle](../Reference/Lifecycle.md) (for example
  `onRequest`, `preHandler`, `onSend`). Use them for cross-cutting logic such
  as authentication or logging.
+ **Decorators** attach reusable functionality or data to the `fastify`,
  `request`, or `reply` objects.
+ **Plugins** encapsulate routes, hooks, and decorators into a self-contained,
  reusable unit.

A typical Express middleware:

```js
app.use((req, res, next) => {
  req.requestTime = Date.now()
  next()
})
```

The Fastify equivalent uses an `onRequest` hook. Instead of `next()`, you call
`done()` (or use an `async` function and `return`):

```js
fastify.addHook('onRequest', (request, reply, done) => {
  request.requestTime = Date.now()
  done()
})

// or async
fastify.addHook('onRequest', async (request, reply) => {
  request.requestTime = Date.now()
})
```

To attach a property to every request efficiently, prefer a decorator, which
pre-allocates the field for better performance:

```js
fastify.decorateRequest('requestTime', 0)

fastify.addHook('onRequest', async (request) => {
  request.requestTime = Date.now()
})
```

#### Per-route middleware
<a id="per-route-middleware"></a>

Express attaches middleware to individual routes as extra arguments. Fastify
uses the `preHandler` hook in the route options:

```js
// Express
app.get('/private', authenticate, (req, res) => {
  res.send('secret')
})

// Fastify
fastify.get('/private', {
  preHandler: async (request, reply) => {
    if (!request.headers.authorization) {
      throw fastify.httpErrors?.unauthorized() ?? new Error('Unauthorized')
    }
  }
}, async (request, reply) => {
  return 'secret'
})
```

#### Using existing Express middleware
<a id="express-middleware"></a>

If a plugin does not yet exist for a piece of middleware, register
[`@fastify/middie`](https://github.com/fastify/middie) to run Express-style
middleware with `fastify.use()`:

```js
await fastify.register(require('@fastify/middie'))

fastify.use(require('cors')())
fastify.use((req, res, next) => {
  // Express-style middleware
  next()
})
```

For full Express compatibility (including middleware that relies on the Express
request/response prototypes), use
[`@fastify/express`](https://github.com/fastify/fastify-express) instead. Treat
both as migration aids rather than a final destination.

### Error handling
<a id="error-handling"></a>

Express uses error-handling middleware with four arguments. Fastify has a
dedicated `setErrorHandler`:

```js
// Express
app.use((err, req, res, next) => {
  res.status(500).send({ error: err.message })
})

// Fastify
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  reply.status(error.statusCode ?? 500).send({ error: error.message })
})
```

In handlers you throw errors instead of calling `next(err)`. The
[`@fastify/sensible`](https://github.com/fastify/fastify-sensible) plugin adds
`httpErrors` helpers such as `fastify.httpErrors.notFound()`.

### 404 / not found handling
<a id="not-found"></a>

A catch-all `app.use` in Express becomes `setNotFoundHandler` in Fastify:

```js
// Express
app.use((req, res) => {
  res.status(404).send({ error: 'Not Found' })
})

// Fastify
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({ error: 'Not Found' })
})
```

### Modular routes: Router vs. plugins
<a id="modular-routes"></a>

Express groups routes with `express.Router()`:

```js
// routes/user.js
const router = require('express').Router()
router.get('/', listUsers)
router.get('/:id', getUser)
module.exports = router

// app.js
app.use('/user', require('./routes/user'))
```

In Fastify a plugin plays the role of a router. Register it with a `prefix`:

```js
// routes/user.js
module.exports = async function (fastify, opts) {
  fastify.get('/', listUsers)
  fastify.get('/:id', getUser)
}

// app.js
fastify.register(require('./routes/user'), { prefix: '/user' })
```

Because plugins are encapsulated, hooks and decorators added inside
`routes/user.js` only apply to that subtree. This is a key advantage over
Express, where middleware order and scope are implicit. See the
[Plugins Guide](./Plugins-Guide.md) for details.

### Validation and serialization
<a id="validation"></a>

In Express, input validation is manual or delegated to libraries. Fastify
validates requests and serializes responses from
[JSON Schema](../Reference/Validation-and-Serialization.md) attached to a route,
which also improves performance:

```js
fastify.post('/user', {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'age'],
      properties: {
        name: { type: 'string' },
        age: { type: 'integer', minimum: 0 }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  const user = await db.createUser(request.body)
  reply.code(201)
  return user
})
```

If the body does not match the schema, Fastify responds with a `400` before the
handler runs — no manual checks required.

### Static files
<a id="static-files"></a>

Replace `express.static` with
[`@fastify/static`](https://github.com/fastify/fastify-static):

```js
// Express
app.use(express.static('public'))

// Fastify
const path = require('node:path')
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public')
})
```

### Template rendering
<a id="templates"></a>

`res.render` is provided by [`@fastify/view`](https://github.com/fastify/point-of-view):

```js
// Express
app.set('view engine', 'ejs')
app.get('/', (req, res) => res.render('index', { text: 'hi' }))

// Fastify
fastify.register(require('@fastify/view'), {
  engine: { ejs: require('ejs') }
})

fastify.get('/', (request, reply) => {
  reply.view('/templates/index.ejs', { text: 'hi' })
})
```

### CORS, Helmet, cookies, and sessions
<a id="common-plugins"></a>

These popular middleware packages have official plugins with familiar options:

```js
fastify.register(require('@fastify/cors'), { origin: true })
fastify.register(require('@fastify/helmet'))
fastify.register(require('@fastify/cookie'))
```

### Next steps
<a id="next-steps"></a>

+ Read the [Getting Started](./Getting-Started.md) guide for a full tour.
+ Learn the request [Lifecycle](../Reference/Lifecycle.md) to understand when
  each hook runs.
+ Explore the [Plugins Guide](./Plugins-Guide.md) to structure larger
  applications.
+ Browse the [Ecosystem](./Ecosystem.md) for plugins that replace your existing
  Express middleware.
