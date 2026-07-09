# Migrating from Express

This guide helps you migrate an existing [Express](https://expressjs.com/)
application to Fastify. It maps the most common Express patterns to their
Fastify equivalents and provides side-by-side code examples.

Fastify and Express share a similar mental model: both are minimal HTTP
frameworks built around routes and middleware. The main differences you will
encounter are:

- Fastify replaces most middleware with **hooks**, **plugins**, and
  **decorators**.
- Fastify uses an asynchronous `reply` API instead of mutating a `res` object.
- Fastify encourages **JSON Schema** for validation and serialization instead
  of manual checks.
- Fastify wraps the raw Node.js `req` and `res` objects inside
  [`Request`](../Reference/Request.md) and [`Reply`](../Reference/Reply.md)
  instances.

You do not have to rewrite everything at once. The
[Run Express middleware](#run-express-middleware) section shows how to run
existing Express middleware inside Fastify so you can migrate incrementally.

## Installation

Express and Fastify install the same way:

```bash
npm install fastify
```

## Creating the server

In Express, you create an application and call `listen`:

```js
const express = require('express')
const app = express()

app.get('/', (req, res) => {
  res.send('hello world')
})

app.listen(3000, () => {
  console.log('Server listening on port 3000')
})
```

In Fastify, you create an instance, register routes, and call `listen` with an
options object. Fastify returns a promise from `listen`, so `async`/`await` is
the recommended style:

```js
const Fastify = require('fastify')
const fastify = Fastify({ logger: true })

fastify.get('/', async (request, reply) => {
  return 'hello world'
})

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

Two things stand out:

- Fastify ships with a built-in [logger](../Reference/Logging.md)
  ([Pino](https://getpino.io/)). Enable it with `{ logger: true }` instead of
  adding a separate logging middleware such as `morgan`.
- Returning a value from an `async` handler sends the response. There is no need
  to call `res.send` explicitly.

## Routing

### Basic routes

Route declaration is almost identical. Express uses `(req, res)`; Fastify uses
`(request, reply)`.

```js
// Express
app.get('/users', (req, res) => {
  res.json([{ name: 'Jane' }])
})

app.post('/users', (req, res) => {
  res.status(201).json({ created: true })
})
```

```js
// Fastify
fastify.get('/users', async (request, reply) => {
  return [{ name: 'Jane' }]
})

fastify.post('/users', async (request, reply) => {
  reply.code(201)
  return { created: true }
})
```

Fastify also supports a `method`/`url`/`handler` object form via
[`fastify.route`](../Reference/Routes.md), which is useful when attaching
schemas and hooks to a single route.

### Route parameters, query, and body

The request properties map directly:

| Express          | Fastify              |
| ---------------- | -------------------- |
| `req.params`     | `request.params`     |
| `req.query`      | `request.query`      |
| `req.body`       | `request.body`       |
| `req.headers`    | `request.headers`    |
| `req.url`        | `request.url`        |

```js
// Express
app.get('/users/:id', (req, res) => {
  const { id } = req.params
  const { verbose } = req.query
  res.json({ id, verbose })
})
```

```js
// Fastify
fastify.get('/users/:id', async (request, reply) => {
  const { id } = request.params
  const { verbose } = request.query
  return { id, verbose }
})
```

Fastify parses JSON and URL-encoded bodies out of the box, so the
`express.json()` and `express.urlencoded()` middleware are not required. See
[ContentTypeParser](../Reference/ContentTypeParser.md) to add parsers for other
content types.

### Routers and prefixes

Express uses `express.Router()` to group routes and mount them under a path:

```js
// Express
const router = express.Router()

router.get('/', (req, res) => res.send('list'))
router.get('/:id', (req, res) => res.send('detail'))

app.use('/users', router)
```

In Fastify, a [plugin](../Reference/Plugins.md) plays the role of a router. Pass
a `prefix` when registering it:

```js
// Fastify
async function usersRoutes (fastify, options) {
  fastify.get('/', async () => 'list')
  fastify.get('/:id', async () => 'detail')
}

fastify.register(usersRoutes, { prefix: '/users' })
```

Plugins are also an encapsulation boundary. Hooks and decorators added inside a
plugin apply only to that plugin and its children, which is different from
Express where middleware order is global. Read the
[Plugins Guide](./Plugins-Guide.md) for details.

## Sending responses

Express mutates the `res` object. Fastify prefers returning a value, but the
`reply` object exposes equivalent methods when you need them.

| Express                       | Fastify                             |
| ----------------------------- | ----------------------------------- |
| `res.send(body)`              | `return body` or `reply.send(body)` |
| `res.json(obj)`               | `return obj`                        |
| `res.status(201)`             | `reply.code(201)`                   |
| `res.set('X-Foo', 'bar')`     | `reply.header('X-Foo', 'bar')`      |
| `res.redirect('/login')`      | `reply.redirect('/login')`          |
| `res.type('text/html')`       | `reply.type('text/html')`           |
| `res.sendStatus(204)`         | `reply.code(204).send()`            |

Methods on `reply` are chainable:

```js
// Express
app.get('/download', (req, res) => {
  res.status(200).set('Content-Type', 'text/plain').send('file contents')
})
```

```js
// Fastify
fastify.get('/download', async (request, reply) => {
  reply.code(200).type('text/plain')
  return 'file contents'
})
```

> ℹ️ Note:
> When you return a value from the handler, do not also call `reply.send()`.
> If you use `reply.send()` in an `async` handler, return `reply` to signal
> that the response is handled. See [Reply](../Reference/Reply.md) for details.

## Middleware, hooks, and plugins

Express is built around middleware. Fastify replaces most middleware use cases
with [hooks](../Reference/Hooks.md), which run at specific points in the
[request lifecycle](../Reference/Lifecycle.md).

The most common replacement for `app.use((req, res, next) => {})` is the
`preHandler` or `onRequest` hook:

```js
// Express: authentication middleware
app.use((req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send('unauthorized')
  }
  req.user = decodeToken(req.headers.authorization)
  next()
})
```

```js
// Fastify: onRequest hook
fastify.addHook('onRequest', async (request, reply) => {
  if (!request.headers.authorization) {
    reply.code(401)
    throw new Error('unauthorized')
  }
  request.user = decodeToken(request.headers.authorization)
})
```

Notable differences:

- Hooks are `async`. Instead of calling `next()`, you resolve (or reject) the
  returned promise. A `(request, reply, done)` callback style is also available.
- To stop the request, either `throw` an error or send a reply from the hook.
- Register a hook per route by passing it in the route options:

```js
fastify.get('/private', {
  onRequest: async (request, reply) => {
    // route-scoped hook
  }
}, async (request, reply) => {
  return 'secret'
})
```

Because plugins encapsulate hooks, you can restrict a hook to a group of routes
by registering both inside the same plugin, rather than relying on middleware
ordering.

### Run Express middleware

If you rely on middleware that does not yet have a Fastify equivalent, or you
want to migrate incrementally, register
[`@fastify/express`](https://github.com/fastify/fastify-express) or
[`@fastify/middie`](https://github.com/fastify/middie) and keep using `use`:

```js
await fastify.register(require('@fastify/express'))

fastify.use(require('cors')())
fastify.use(someExistingExpressMiddleware)
```

Use [`@fastify/middie`](https://github.com/fastify/middie) for plain
Express-style middleware, and
[`@fastify/express`](https://github.com/fastify/fastify-express) for full
Express compatibility. See [Middleware](../Reference/Middleware.md) for details
and caveats.

## Error handling

Express uses error-handling middleware with four arguments. Fastify uses
`setErrorHandler`, and errors thrown from handlers or hooks are routed to it
automatically.

```js
// Express
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal Server Error' })
})
```

```js
// Fastify
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  reply.status(500).send({ error: 'Internal Server Error' })
})
```

In handlers, throw errors instead of passing them to `next`:

```js
// Express
app.get('/thing', (req, res, next) => {
  findThing((err, thing) => {
    if (err) return next(err)
    res.json(thing)
  })
})
```

```js
// Fastify
fastify.get('/thing', async (request, reply) => {
  return await findThing() // a rejected promise is sent to the error handler
})
```

You can attach a `statusCode` to an error, or use a library such as
[`@fastify/sensible`](https://github.com/fastify/fastify-sensible) for helpers
like `httpErrors.notFound()`. See [Errors](../Reference/Errors.md).

### Not found (404) handler

Express handles unmatched routes with a final middleware. Fastify provides
`setNotFoundHandler`:

```js
// Express
app.use((req, res) => {
  res.status(404).send('Not Found')
})
```

```js
// Fastify
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send('Not Found')
})
```

## Validation and serialization

In Express, request validation is usually manual or handled by a library such
as `joi` or `express-validator`:

```js
// Express
app.post('/users', (req, res) => {
  if (typeof req.body.name !== 'string') {
    return res.status(400).json({ error: 'name is required' })
  }
  // ...
})
```

Fastify has validation built in through
[JSON Schema](../Reference/Validation-and-Serialization.md). Attach a `schema`
to the route, and Fastify validates the request and returns a `400` on failure
automatically:

```js
// Fastify
fastify.post('/users', {
  schema: {
    body: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  // request.body.name is guaranteed to be a string here
  return { created: true }
})
```

A `response` schema additionally speeds up serialization and filters out fields
that should not be exposed:

```js
fastify.get('/users/:id', {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return getUser(request.params.id)
})
```

## Sharing state: app.locals and res.locals

Express exposes `app.locals` for application state and `res.locals` for
per-request state. Fastify uses [decorators](../Reference/Decorators.md)
instead.

Application-level state maps to `fastify.decorate`:

```js
// Express
app.locals.db = createConnection()

// later
app.locals.db.query(/* ... */)
```

```js
// Fastify
fastify.decorate('db', createConnection())

// later, anywhere the instance is in scope
fastify.db.query(/* ... */)
```

Per-request state maps to `fastify.decorateRequest` (declared once, assigned in
a hook), which is faster than adding a property on each request:

```js
// Express
app.use((req, res, next) => {
  res.locals.requestId = generateId()
  next()
})
```

```js
// Fastify
fastify.decorateRequest('requestId', null)

fastify.addHook('onRequest', async (request) => {
  request.requestId = generateId()
})
```

## Static files and templates

These features live in official plugins:

```js
// Express
app.use(express.static('public'))
app.set('view engine', 'ejs')
```

```js
// Fastify
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public')
})

fastify.register(require('@fastify/view'), {
  engine: { ejs: require('ejs') }
})

fastify.get('/', async (request, reply) => {
  return reply.view('/index.ejs', { text: 'hello' })
})
```

See [`@fastify/static`](https://github.com/fastify/fastify-static) and
[`@fastify/view`](https://github.com/fastify/point-of-view).

## Plugin equivalents for common middleware

Fastify offers official plugins for the most widely used Express middleware:

| Express middleware | Fastify plugin                                       |
| ------------------ | ---------------------------------------------------- |
| `cors`             | [`@fastify/cors`](https://github.com/fastify/fastify-cors) |
| `helmet`           | [`@fastify/helmet`](https://github.com/fastify/fastify-helmet) |
| `serve-static`     | [`@fastify/static`](https://github.com/fastify/fastify-static) |
| `cookie-parser`    | [`@fastify/cookie`](https://github.com/fastify/fastify-cookie) |
| `express-session`  | [`@fastify/session`](https://github.com/fastify/session) |
| `multer`           | [`@fastify/multipart`](https://github.com/fastify/fastify-multipart) |
| `morgan`           | built-in [Pino](../Reference/Logging.md) logger      |
| `express-rate-limit` | [`@fastify/rate-limit`](https://github.com/fastify/fastify-rate-limit) |

Browse the [Ecosystem](./Ecosystem.md) guide for the full list of core and
community plugins.

## Suggested migration path

For a large application, migrate incrementally instead of rewriting everything
at once:

1. Stand up a Fastify instance and register
   [`@fastify/express`](https://github.com/fastify/fastify-express) so existing
   middleware keeps working.
2. Move routes into plugins one group at a time, converting `req`/`res` usage to
   `request`/`reply`.
3. Replace middleware with hooks and official plugins as you go.
4. Add JSON Schema validation and response serialization to each route.
5. Remove `@fastify/express` once no Express middleware remains.

## Where to go next

- [Getting Started](./Getting-Started.md): the introductory tutorial.
- [Plugins Guide](./Plugins-Guide.md): how encapsulation and plugins work.
- [Hooks](../Reference/Hooks.md) and [Lifecycle](../Reference/Lifecycle.md): the
  request lifecycle in detail.
- [Validation and Serialization](../Reference/Validation-and-Serialization.md):
  the schema system.
- [Middleware](../Reference/Middleware.md): running Express-style middleware.
