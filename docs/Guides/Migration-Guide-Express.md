<h1 align="center">Fastify</h1>

## Migration Guide (Express to Fastify)
<a id="migration-guide-express"></a>

This guide helps developers migrate an existing
[Express](https://expressjs.com/) application to Fastify. It maps the
concepts you already know from Express to their Fastify equivalents and
shows side-by-side code examples for the most common patterns.

Fastify is not a drop-in replacement for Express, but the two frameworks
share many ideas. Most Express applications can be migrated incrementally,
and Fastify even ships an official compatibility layer that lets you keep
using existing Express middleware while you migrate.

## Table Of Contents
<a id="toc"></a>

+ [Why migrate](#why-migrate)
+ [Key differences](#key-differences)
+ [Application setup](#application-setup)
+ [Routing](#routing)
+ [Route parameters and query strings](#route-parameters)
+ [Sending responses](#sending-responses)
+ [Request body parsing](#request-body-parsing)
+ [Middleware](#middleware)
+ [Reusing Express middleware](#reusing-express-middleware)
+ [Hooks: the Fastify way](#hooks)
+ [Routers and modularity](#routers-and-modularity)
+ [Error handling](#error-handling)
+ [404 / not found handling](#not-found-handling)
+ [Serving static files](#serving-static-files)
+ [Template rendering](#template-rendering)
+ [Validation and serialization](#validation-and-serialization)
+ [Plugin equivalents](#plugin-equivalents)
+ [Incremental migration strategy](#incremental-migration)
+ [Checklist](#checklist)

### Why migrate
<a id="why-migrate"></a>

Fastify provides several advantages over Express:

+ **Performance**: Fastify is one of the fastest Node.js web frameworks,
  thanks to its optimized router and its fast JSON serializer.
+ **Schema based**: request validation and response serialization are
  driven by [JSON Schema](https://json-schema.org/), improving both safety
  and speed.
+ **Encapsulation**: the plugin system provides strong encapsulation, so
  decorators, hooks, and plugins registered in one context do not leak into
  others.
+ **Developer experience**: first-class TypeScript support, a built-in
  [Pino](https://getpino.io/) logger, and a rich plugin ecosystem.
+ **Async by default**: route handlers can be `async` functions, and
  returning a value or throwing an error is enough.

### Key differences
<a id="key-differences"></a>

Before diving into code, keep these conceptual differences in mind:

| Express | Fastify |
| --- | --- |
| `app` created by calling `express()` | instance created by calling `Fastify()` |
| Middleware (`app.use`) is the core primitive | Hooks and plugins are the core primitives |
| `res.send`, `res.json`, `res.status(...)` | `reply.send`, `reply.code(...)` |
| Body parsing added via middleware | JSON/text body parsing is built in |
| `express.Router()` for modularity | Plugins with encapsulation |
| Errors passed to `next(err)` | Errors thrown or returned from handlers |
| No built-in validation | JSON Schema validation and serialization |
| No built-in logger | Built-in Pino logger |

The most important shift is mental: in Express you tend to reach for
middleware for everything, while in Fastify you use **hooks** for
cross-cutting concerns and **plugins** for encapsulated, reusable
functionality.

### Application setup
<a id="application-setup"></a>

In Express you create an app and start listening:

```js
// Express
const express = require('express')
const app = express()

app.get('/', (req, res) => {
  res.send('hello world')
})

app.listen(3000, () => {
  console.log('Server listening on port 3000')
})
```

In Fastify you create an instance, optionally enabling the built-in logger,
and call `listen` with an options object:

```js
// Fastify (CommonJS)
const fastify = require('fastify')({
  logger: true
})

fastify.get('/', (request, reply) => {
  reply.send('hello world')
})

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})
```

The same example using ECMAScript Modules (ESM) and `async`/`await`:

```js
// Fastify (ESM)
import Fastify from 'fastify'

const fastify = Fastify({ logger: true })

fastify.get('/', async (request, reply) => {
  return 'hello world'
})

try {
  await fastify.listen({ port: 3000 })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
```

> If you are using ESM, be sure to include `"type": "module"` in your
> package.json.

Note that `fastify.listen` takes an options object (`{ port, host }`)
rather than positional arguments. To accept connections on all IPv4
interfaces, for example inside a container, use
`fastify.listen({ port: 3000, host: '0.0.0.0' })`.

### Routing
<a id="routing"></a>

Basic route declaration is nearly identical. Express:

```js
// Express
app.get('/', handler)
app.post('/user', handler)
app.put('/user/:id', handler)
app.delete('/user/:id', handler)
```

Fastify supports the same shorthand methods:

```js
// Fastify
fastify.get('/', handler)
fastify.post('/user', handler)
fastify.put('/user/:id', handler)
fastify.delete('/user/:id', handler)
```

Fastify also offers a full-declaration form, `fastify.route(...)`, which
lets you attach a schema, hooks, and other options to a single route:

```js
// Fastify: full route declaration
fastify.route({
  method: 'GET',
  url: '/user/:id',
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      }
    }
  },
  handler: (request, reply) => {
    reply.send({ id: request.params.id })
  }
})
```

### Route parameters and query strings
<a id="route-parameters"></a>

Accessing parameters and query strings is very similar. The main
difference is that in Fastify the objects are `request.params`,
`request.query`, and `request.body` (note the argument is named `request`,
not `req`, by convention).

```js
// Express
app.get('/user/:id', (req, res) => {
  const { id } = req.params
  const { page } = req.query
  res.send({ id, page })
})
```

```js
// Fastify
fastify.get('/user/:id', (request, reply) => {
  const { id } = request.params
  const { page } = request.query
  reply.send({ id, page })
})
```

Wildcard and parametric routes work as well. A wildcard is declared with
`*` and read from `request.params['*']`:

```js
// Fastify
fastify.get('/static/*', (request, reply) => {
  reply.send(request.params['*'])
})
```

### Sending responses
<a id="sending-responses"></a>

This is one of the most common changes when migrating. The `Reply` object
replaces Express's `res`.

| Express | Fastify |
| --- | --- |
| `res.send(payload)` | `reply.send(payload)` or `return payload` |
| `res.json(obj)` | `reply.send(obj)` or `return obj` |
| `res.status(201).send(...)` | `reply.code(201).send(...)` |
| `res.set('X-Foo', 'bar')` | `reply.header('X-Foo', 'bar')` |
| `res.type('text/html')` | `reply.type('text/html')` |
| `res.redirect('/login')` | `reply.redirect('/login')` |
| `res.sendStatus(204)` | `reply.code(204).send()` |

In Fastify, sending a JavaScript object automatically serializes it to
JSON and sets the `content-type` header to `application/json`, so there is
no separate `res.json`:

```js
// Express
app.get('/user', (req, res) => {
  res.status(200).json({ name: 'Jane' })
})
```

```js
// Fastify
fastify.get('/user', (request, reply) => {
  reply.code(200).send({ name: 'Jane' })
})
```

With `async` handlers you can simply return the payload, and Fastify sends
it for you:

```js
// Fastify (async)
fastify.get('/user', async (request, reply) => {
  reply.code(200)
  return { name: 'Jane' }
})
```

> Do not mix the two styles for the same request. If you `return` a value
> **and** call `reply.send()`, or if you `await reply.send()` and also
> return a payload, Fastify may warn or throw. Pick one: either `return`
> the payload or call `reply.send()`.

### Request body parsing
<a id="request-body-parsing"></a>

In Express you must register body-parsing middleware:

```js
// Express
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.post('/user', (req, res) => {
  res.send(req.body)
})
```

Fastify parses `application/json` and `text/plain` request bodies out of
the box, so no middleware is required:

```js
// Fastify
fastify.post('/user', (request, reply) => {
  reply.send(request.body)
})
```

To parse `application/x-www-form-urlencoded` bodies (the equivalent of
`express.urlencoded`), register the
[`@fastify/formbody`](https://github.com/fastify/fastify-formbody) plugin.
For multipart/form-data (file uploads), use
[`@fastify/multipart`](https://github.com/fastify/fastify-multipart). You
can also register your own parser for any content type with
`fastify.addContentTypeParser(...)`.

### Middleware
<a id="middleware"></a>

Express middleware is the pattern `(req, res, next) => {}` registered with
`app.use`. Fastify does not use this signature natively; instead you
express the same logic with **hooks** (for cross-cutting behavior) or
**plugins** (for reusable, encapsulated features).

A typical Express middleware:

```js
// Express
app.use((req, res, next) => {
  req.requestTime = Date.now()
  next()
})
```

The Fastify equivalent using the `onRequest` hook:

```js
// Fastify
fastify.addHook('onRequest', async (request, reply) => {
  request.requestTime = Date.now()
})
```

Hooks are `async` functions (or take a `done` callback). To short-circuit
a request, for example when authentication fails, send a reply and return.
There is no `next(err)`; you throw or send instead:

```js
// Fastify: stop the request from an onRequest hook
fastify.addHook('onRequest', async (request, reply) => {
  if (!request.headers.authorization) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
})
```

Alternatively, throwing an error routes it to the error handler:

```js
// Fastify
fastify.addHook('onRequest', async (request, reply) => {
  if (!request.headers.authorization) {
    const err = new Error('Unauthorized')
    err.statusCode = 401
    throw err
  }
})
```

### Reusing Express middleware
<a id="reusing-express-middleware"></a>

You do not have to rewrite every middleware at once. Register the official
[`@fastify/express`](https://github.com/fastify/fastify-express) plugin to
run existing Express middleware inside Fastify. This is ideal for an
incremental migration:

```js
// Fastify
const fastify = require('fastify')()

await fastify.register(require('@fastify/express'))

// Now you can use Express middleware
fastify.use(require('cors')())
fastify.use(require('helmet')())
```

For lightweight middleware support without full Express compatibility,
[`@fastify/middie`](https://github.com/fastify/middie) is a smaller
alternative. Both plugins are intended as migration aids: once your
migration stabilizes, prefer native Fastify plugins (for example
[`@fastify/cors`](https://github.com/fastify/fastify-cors) and
[`@fastify/helmet`](https://github.com/fastify/fastify-helmet)) for the
best performance.

### Hooks: the Fastify way
<a id="hooks"></a>

Fastify exposes lifecycle hooks that give you far more precise control than
Express middleware ordering. The most commonly used request/reply hooks
are:

| Hook | Runs | Common Express use replaced |
| --- | --- | --- |
| `onRequest` | as soon as a request is received | auth, request timing |
| `preParsing` | before the body is parsed | raw body transforms |
| `preValidation` | before schema validation | mutate payload |
| `preHandler` | before the route handler | auth, loading data |
| `onSend` | before the payload is sent | mutate response body |
| `onResponse` | after the response is sent | logging, metrics |
| `onError` | when an error occurs | error logging |

Hooks can be registered globally on the root instance, or scoped to a
plugin (see the next section). You can also attach a `preHandler` to a
single route:

```js
// Fastify: per-route hook
fastify.get('/secret', {
  preHandler: async (request, reply) => {
    await authenticate(request, reply)
  }
}, async (request, reply) => {
  return { secret: true }
})
```

For an in-depth reference, see the
[Hooks documentation](../Reference/Hooks.md).

### Routers and modularity
<a id="routers-and-modularity"></a>

In Express you split an app into `express.Router()` instances:

```js
// Express: routes/user.js
const router = require('express').Router()

router.get('/', listUsers)
router.get('/:id', getUser)

module.exports = router

// Express: app.js
app.use('/user', require('./routes/user'))
```

In Fastify, a plugin is the unit of modularity. Register it under a
`prefix` to mount it at a base path. Everything registered inside the
plugin (routes, hooks, decorators) is **encapsulated** and does not leak
out:

```js
// Fastify: routes/user.js
module.exports = async function (fastify, opts) {
  fastify.get('/', listUsers)
  fastify.get('/:id', getUser)
}

// Fastify: app.js
fastify.register(require('./routes/user'), { prefix: '/user' })
```

Encapsulation is a core benefit over Express: a hook or decorator you add
inside the `user` plugin applies only to that plugin's routes, not the
whole app. To deliberately share functionality with the parent scope, wrap
your plugin with
[`fastify-plugin`](https://github.com/fastify/fastify-plugin).

For automatic, filesystem-based route loading (similar to how some Express
projects auto-require a routes directory), see
[`@fastify/autoload`](https://github.com/fastify/fastify-autoload).

### Error handling
<a id="error-handling"></a>

Express uses error-handling middleware with four arguments:

```js
// Express
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).send({ error: 'Something broke' })
})
```

In Fastify you register a single error handler with `setErrorHandler`.
Errors thrown or returned from handlers and hooks are routed to it
automatically:

```js
// Fastify
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  reply.status(error.statusCode || 500).send({
    error: error.message
  })
})
```

Inside `async` handlers, you simply `throw`; there is no `next(err)`:

```js
// Fastify
fastify.get('/user/:id', async (request, reply) => {
  const user = await db.find(request.params.id)
  if (!user) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }
  return user
})
```

Fastify also has a default error handler that logs the error and sends a
well-formed JSON response, so uncaught errors will not crash the process
the way an unhandled Express error can.

### 404 / not found handling
<a id="not-found-handling"></a>

In Express, a catch-all middleware at the end handles unmatched routes:

```js
// Express
app.use((req, res) => {
  res.status(404).send({ error: 'Not found' })
})
```

Fastify has a dedicated API, `setNotFoundHandler`, which is independent of
route registration order:

```js
// Fastify
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({ error: 'Not found' })
})
```

### Serving static files
<a id="serving-static-files"></a>

Express serves static assets with the built-in `express.static`:

```js
// Express
app.use(express.static('public'))
```

In Fastify, use the
[`@fastify/static`](https://github.com/fastify/fastify-static) plugin:

```js
// Fastify
const path = require('node:path')

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/' // optional: default '/'
})
```

Files under `public` are then served, and `reply.sendFile('index.html')`
becomes available on the reply object.

### Template rendering
<a id="template-rendering"></a>

Express configures a view engine with `app.set('view engine', ...)` and
renders with `res.render`:

```js
// Express
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
  res.render('index', { title: 'Home' })
})
```

Fastify uses the
[`@fastify/view`](https://github.com/fastify/point-of-view) plugin, which
supports EJS, Handlebars, Pug, Nunjucks, and more:

```js
// Fastify
fastify.register(require('@fastify/view'), {
  engine: {
    ejs: require('ejs')
  }
})

fastify.get('/', (request, reply) => {
  reply.view('/templates/index.ejs', { title: 'Home' })
})
```

### Validation and serialization
<a id="validation-and-serialization"></a>

This is a feature Express does not provide out of the box. In Express you
typically validate manually or with a third-party library:

```js
// Express
app.post('/user', (req, res) => {
  if (typeof req.body.name !== 'string') {
    return res.status(400).send({ error: 'name is required' })
  }
  // ...
})
```

Fastify validates the request against a
[JSON Schema](https://json-schema.org/) attached to the route. Invalid
requests are rejected automatically with a `400` before your handler runs,
and the response can be serialized from a schema for a significant speed
boost:

```js
// Fastify
fastify.post('/user', {
  schema: {
    body: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' }
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
  const user = await createUser(request.body)
  reply.code(201)
  return user
})
```

See the
[Validation and Serialization](../Reference/Validation-and-Serialization.md)
reference for details.

### Plugin equivalents
<a id="plugin-equivalents"></a>

Common Express middleware map to first-party or well-maintained Fastify
plugins:

| Express package | Fastify equivalent |
| --- | --- |
| `body-parser` / `express.json` | built in (JSON, text) |
| `express.urlencoded` | [`@fastify/formbody`](https://github.com/fastify/fastify-formbody) |
| `multer` | [`@fastify/multipart`](https://github.com/fastify/fastify-multipart) |
| `cors` | [`@fastify/cors`](https://github.com/fastify/fastify-cors) |
| `helmet` | [`@fastify/helmet`](https://github.com/fastify/fastify-helmet) |
| `cookie-parser` | [`@fastify/cookie`](https://github.com/fastify/fastify-cookie) |
| `express-session` | [`@fastify/session`](https://github.com/fastify/session) |
| `express.static` | [`@fastify/static`](https://github.com/fastify/fastify-static) |
| `morgan` | built-in Pino logger (`logger: true`) |
| `express-rate-limit` | [`@fastify/rate-limit`](https://github.com/fastify/fastify-rate-limit) |
| `passport` | [`@fastify/passport`](https://github.com/fastify/fastify-passport) |
| view engines (`res.render`) | [`@fastify/view`](https://github.com/fastify/point-of-view) |
| `swagger-ui-express` | [`@fastify/swagger`](https://github.com/fastify/fastify-swagger) |

Browse the full list of core and community plugins in the
[Ecosystem](./Ecosystem.md) guide.

### Incremental migration strategy
<a id="incremental-migration"></a>

For large applications, migrate gradually rather than rewriting at once:

1. Stand up a Fastify instance and register
   [`@fastify/express`](https://github.com/fastify/fastify-express) so your
   existing Express middleware keeps working.
2. Move routes over one module at a time, converting each
   `express.Router()` into a Fastify plugin registered under a `prefix`.
3. Replace `req`/`res` usage with `request`/`reply` in the migrated routes,
   and switch `res.status(...).json(...)` to `reply.code(...).send(...)`.
4. Add JSON Schema validation and response serialization to migrated
   routes to gain safety and performance.
5. Swap Express middleware for native Fastify plugins from the table above.
6. Once no Express middleware remains, remove `@fastify/express` to drop
   the compatibility layer and its overhead.

### Checklist
<a id="checklist"></a>

+ Replace `express()` with `Fastify()` and update `listen` to take an
  options object.
+ Rename handler arguments from `(req, res)` to `(request, reply)`.
+ Convert `res.status().json()`/`res.send()` to
  `reply.code().send()` or `return` the payload.
+ Remove `express.json()`; rely on built-in body parsing (add
  `@fastify/formbody` for urlencoded bodies).
+ Convert middleware to hooks (`onRequest`, `preHandler`, ...) or plugins.
+ Convert `express.Router()` modules into encapsulated plugins with a
  `prefix`.
+ Replace error-handling middleware with `setErrorHandler`, and unmatched
  route handling with `setNotFoundHandler`.
+ Swap Express middleware packages for their Fastify plugin equivalents.
+ Add JSON Schema validation and serialization to your routes.

For a deeper introduction to the framework, read the
[Getting Started](./Getting-Started.md) guide.
