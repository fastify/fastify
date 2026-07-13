<h1 align="center">Migrating from Express</h1>

This guide is intended to help developers who are familiar with
[Express](https://expressjs.com/) move an existing application, or their mental
model, over to Fastify. It maps the most common Express patterns to their
Fastify equivalents and highlights the differences that matter in practice.

Fastify is not a drop-in replacement for Express: the request lifecycle, the
plugin system, and the request/reply objects are different by design. However,
most concepts have a direct counterpart, and Fastify can even run existing
Express middleware through a compatibility layer while you migrate
incrementally.

### Contents

- [Why migrate?](#why-migrate)
- [The application instance](#the-application-instance)
- [Routing](#routing)
- [Route parameters and query strings](#route-parameters-and-query-strings)
- [The request and reply objects](#the-request-and-reply-objects)
- [Body parsing](#body-parsing)
- [Middleware](#middleware)
- [Routers and modularity](#routers-and-modularity)
- [Error handling](#error-handling)
- [404 / not found handling](#404--not-found-handling)
- [Static files](#static-files)
- [Templates and views](#templates-and-views)
- [CORS](#cors)
- [Validation and serialization](#validation-and-serialization)
- [Running an existing Express app inside Fastify](#running-an-existing-express-app-inside-fastify)
- [Cheat sheet](#cheat-sheet)

## Why migrate?
<a id="why-migrate"></a>

Fastify provides several features out of the box that require extra libraries in
a typical Express application:

- A high-performance logger ([Pino](https://getpino.io/)) built in.
- Request validation and response serialization based on JSON Schema.
- An encapsulation model that keeps plugins, decorators, and hooks isolated.
- First-class `async/await` support in handlers and hooks.
- A rich lifecycle with hooks instead of a single middleware chain.

The rest of this guide shows how the patterns you already know translate to
Fastify.

## The application instance
<a id="the-application-instance"></a>

In Express you create an app by calling the exported function. In Fastify you
call the factory and, conventionally, enable the logger.

Express:
```js
const express = require('express')
const app = express()

app.listen(3000, () => {
  console.log('Server listening on port 3000')
})
```

Fastify:
```js
// ESM
import Fastify from 'fastify'
// CommonJS
const Fastify = require('fastify')

const app = Fastify({ logger: true })

app.listen({ port: 3000 }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  // Server listening on ${address}
})
```

Note that `listen` takes an options object (`{ port, host }`) rather than
positional arguments, and it returns a promise if you omit the callback:

```js
await app.listen({ port: 3000, host: '0.0.0.0' })
```

## Routing
<a id="routing"></a>

The route method signatures are nearly identical. The main difference is the
handler: in Fastify you return the payload (or use `reply.send`) instead of
calling `res.send`.

Express:
```js
app.get('/', (req, res) => {
  res.send('hello world')
})

app.post('/users', (req, res) => {
  res.status(201).json({ id: 1 })
})
```

Fastify:
```js
app.get('/', (request, reply) => {
  reply.send('hello world')
})

app.post('/users', (request, reply) => {
  reply.code(201).send({ id: 1 })
})
```

With `async/await` you can simply return the payload and Fastify will serialize
it as JSON automatically:

```js
app.get('/users', async (request, reply) => {
  const users = await db.getUsers()
  return users // sent as application/json
})
```

Fastify also supports the full route declaration, which is the idiomatic way to
attach schemas, hooks, and options to a route:

```js
app.route({
  method: 'GET',
  url: '/users/:id',
  handler: async (request, reply) => {
    return db.getUser(request.params.id)
  }
})
```

## Route parameters and query strings
<a id="route-parameters-and-query-strings"></a>

Path parameters and query strings are accessed the same way, via
`request.params` and `request.query`.

Express:
```js
app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id, page: req.query.page })
})
```

Fastify:
```js
app.get('/users/:id', (request, reply) => {
  reply.send({ id: request.params.id, page: request.query.page })
})
```

By default Fastify parses query strings with the `querystring` core module. To
handle nested/array syntax like Express's default, you can configure a custom
`querystringParser` (for example using the `qs` module).

## The request and reply objects
<a id="the-request-and-reply-objects"></a>

Fastify wraps the Node.js request and response rather than extending them. The
table below maps common Express properties and methods to Fastify.

| Express                     | Fastify                              |
| --------------------------- | ------------------------------------ |
| `req.body`                  | `request.body`                       |
| `req.params`                | `request.params`                     |
| `req.query`                 | `request.query`                      |
| `req.headers`               | `request.headers`                    |
| `req.ip`                    | `request.ip`                         |
| `req.path` / `req.url`      | `request.url`                        |
| `req.method`                | `request.method`                     |
| `res.send(body)`            | `reply.send(body)`                   |
| `res.json(obj)`             | `reply.send(obj)`                    |
| `res.status(code)`          | `reply.code(code)` / `reply.status`  |
| `res.set(name, value)`      | `reply.header(name, value)`          |
| `res.type(contentType)`     | `reply.type(contentType)`            |
| `res.redirect(url)`         | `reply.redirect(url)`                |
| `res.sendStatus(code)`      | `reply.code(code).send()`            |

If you need the raw Node.js objects, use `request.raw` and `reply.raw`.

One important difference: in Fastify you must not mix returning a value with
calling `reply.send`. Pick one style per handler.

## Body parsing
<a id="body-parsing"></a>

Express requires `express.json()` (or the `body-parser` package) to populate
`req.body`. Fastify parses `application/json` and
`application/x-www-form-urlencoded`-style content out of the box for the common
content types, so no extra setup is needed for JSON.

Express:
```js
app.use(express.json())

app.post('/echo', (req, res) => {
  res.json(req.body)
})
```

Fastify:
```js
app.post('/echo', (request, reply) => {
  reply.send(request.body) // request.body already parsed for JSON
})
```

To parse other content types, register a custom parser with
`addContentTypeParser` instead of adding middleware:

```js
app.addContentTypeParser('text/csv', { parseAs: 'string' }, (req, body, done) => {
  done(null, parseCsv(body))
})
```

## Middleware
<a id="middleware"></a>

This is the biggest conceptual shift. Express is built around a single
middleware chain (`app.use`). Fastify replaces most middleware use cases with
**hooks**, which run at well-defined points in the request lifecycle and are
scoped to the plugin they are registered in.

Common Express middleware maps to the `onRequest` or `preHandler` hooks:

Express:
```js
app.use((req, res, next) => {
  req.startTime = Date.now()
  next()
})

function authenticate (req, res, next) {
  if (!req.headers.authorization) return res.status(401).send('unauthorized')
  next()
}

app.get('/private', authenticate, (req, res) => {
  res.send('secret')
})
```

Fastify:
```js
app.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now()
})

async function authenticate (request, reply) {
  if (!request.headers.authorization) {
    return reply.code(401).send('unauthorized')
  }
}

app.get('/private', { preHandler: authenticate }, (request, reply) => {
  reply.send('secret')
})
```

Key differences:

- There is no `next` in async hooks; throw an error or call `reply.send` to
  short-circuit, otherwise just return.
- Hooks registered with `addHook` only apply within the current plugin
  (encapsulation), not globally like `app.use`.
- Per-route middleware becomes the `preHandler` (or `onRequest`) option, which
  accepts a single function or an array.

If you rely on Express-style middleware that you cannot easily rewrite, see
[Running an existing Express app inside
Fastify](#running-an-existing-express-app-inside-fastify).

## Routers and modularity
<a id="routers-and-modularity"></a>

Express uses `express.Router()` to split an application into modules. In Fastify
the equivalent is a **plugin**: an encapsulated function that receives a scoped
instance. A common pattern is to give the plugin a route `prefix`.

Express:
```js
// routes/users.js
const router = require('express').Router()

router.get('/', (req, res) => res.json([]))
router.get('/:id', (req, res) => res.json({ id: req.params.id }))

module.exports = router

// app.js
app.use('/users', require('./routes/users'))
```

Fastify:
```js
// routes/users.js
module.exports = async function (app, opts) {
  app.get('/', async () => [])
  app.get('/:id', async (request) => ({ id: request.params.id }))
}

// app.js
app.register(require('./routes/users'), { prefix: '/users' })
```

Anything registered inside a plugin (hooks, decorators, other plugins) stays
local to that plugin and its children. This encapsulation is what allows, for
example, an authentication hook to protect one group of routes without leaking
to the rest of the app.

## Error handling
<a id="error-handling"></a>

Express uses error-handling middleware with four arguments. Fastify uses a
dedicated error handler set with `setErrorHandler`. Thrown errors (including
from async handlers) are routed to it automatically.

Express:
```js
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal Server Error' })
})
```

Fastify:
```js
app.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  reply.status(error.statusCode || 500).send({ error: 'Internal Server Error' })
})
```

In handlers, prefer throwing instead of manually building the response:

```js
app.get('/users/:id', async (request, reply) => {
  const user = await db.getUser(request.params.id)
  if (!user) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err // handled by the error handler
  }
  return user
})
```

The [`@fastify/sensible`](https://github.com/fastify/fastify-sensible) plugin
provides helpers such as `httpErrors.notFound()` for this pattern.

## 404 / not found handling
<a id="404--not-found-handling"></a>

In Express a catch-all middleware at the end handles unmatched routes. Fastify
has a dedicated `setNotFoundHandler`.

Express:
```js
app.use((req, res) => {
  res.status(404).send('Not Found')
})
```

Fastify:
```js
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send('Not Found')
})
```

## Static files
<a id="static-files"></a>

Express ships `express.static`. In Fastify install the
[`@fastify/static`](https://github.com/fastify/fastify-static) plugin.

Express:
```js
app.use(express.static('public'))
```

Fastify:
```js
const path = require('node:path')

app.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/' // optional: default '/'
})
```

## Templates and views
<a id="templates-and-views"></a>

Express has a built-in view engine integration (`app.set('view engine', ...)`
and `res.render`). Fastify provides the same capability through the
[`@fastify/view`](https://github.com/fastify/point-of-view) plugin.

Express:
```js
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
  res.render('index', { text: 'hello' })
})
```

Fastify:
```js
app.register(require('@fastify/view'), {
  engine: { ejs: require('ejs') }
})

app.get('/', (request, reply) => {
  reply.view('/templates/index.ejs', { text: 'hello' })
})
```

## CORS
<a id="cors"></a>

Instead of the `cors` middleware, register
[`@fastify/cors`](https://github.com/fastify/fastify-cors).

Express:
```js
const cors = require('cors')
app.use(cors())
```

Fastify:
```js
app.register(require('@fastify/cors'), {
  origin: true
})
```

## Validation and serialization
<a id="validation-and-serialization"></a>

This has no direct Express equivalent and is one of the main reasons to adopt
Fastify. You attach a JSON Schema to a route to validate the incoming request
and to serialize the response. Validation replaces the ad-hoc checks and
libraries (such as `express-validator`) commonly used with Express.

```js
app.post('/users', {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'number' },
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

If the body does not match the schema, Fastify returns a `400` automatically
before the handler runs. Response serialization based on the schema is also
significantly faster than `JSON.stringify`.

## Running an existing Express app inside Fastify
<a id="running-an-existing-express-app-inside-fastify"></a>

If you cannot rewrite everything at once, you can run Express middleware and
even a whole Express application inside Fastify using
[`@fastify/express`](https://github.com/fastify/fastify-express) (full Express
compatibility) or
[`@fastify/middie`](https://github.com/fastify/middie) (Connect-style
middleware only, and lighter weight). This enables an incremental migration.

```js
const app = require('fastify')()

await app.register(require('@fastify/express'))

// Use existing Express middleware
app.use(require('cors')())
app.use(require('helmet')())

// Mount an existing Express router
app.use('/legacy', require('./legacy-express-router'))

// New routes use the native Fastify API
app.get('/health', async () => ({ status: 'ok' }))

await app.listen({ port: 3000 })
```

A pragmatic strategy is to register `@fastify/express`, move the whole app over,
and then replace middleware and routers with native Fastify hooks and plugins
one at a time until the compatibility layer can be removed.

## Cheat sheet
<a id="cheat-sheet"></a>

| Express                          | Fastify                                        |
| -------------------------------- | ---------------------------------------------- |
| `const app = express()`          | `const app = require('fastify')()`             |
| `app.listen(3000, cb)`           | `app.listen({ port: 3000 }, cb)`               |
| `app.use(express.json())`        | built in (JSON parsed automatically)           |
| `app.use(mw)`                    | `app.addHook('onRequest', hook)`               |
| per-route middleware             | `{ preHandler: fn }` route option              |
| `express.Router()`               | a plugin registered with `app.register`        |
| `res.send` / `res.json`          | `reply.send` / `return value`                  |
| `res.status(code)`               | `reply.code(code)`                             |
| error middleware `(err, ...)`    | `app.setErrorHandler(fn)`                      |
| final 404 middleware             | `app.setNotFoundHandler(fn)`                   |
| `express.static`                 | `@fastify/static`                              |
| `res.render` / view engine       | `@fastify/view`                                |
| `cors` middleware                | `@fastify/cors`                                |
| `express-validator` / manual     | JSON Schema on the route `schema` option       |

For a deeper introduction to the framework, continue with the
[Getting Started](./Getting-Started.md) guide and the
[Plugins Guide](./Plugins-Guide.md).
