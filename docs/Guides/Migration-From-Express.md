<h1 align="center">Fastify</h1>

## Migrating from Express

This guide maps common Express patterns to their Fastify equivalents. Read the
[Getting Started](./Getting-Started.md) guide first for an introduction to the
framework.

Most Express applications can be ported route by route. The APIs look similar,
but four differences drive nearly every change:

1. **Plugins replace `Router` and app-level middleware.** Everything is
   registered with `register`, and every registration creates an
   [encapsulated](../Reference/Encapsulation.md) context.
2. **Hooks replace middleware.** Instead of a single `next()` chain, Fastify
   exposes named [lifecycle](../Reference/Lifecycle.md) points
   ([`hooks`](../Reference/Hooks.md)).
3. **Handlers may return a value.** Returning a payload from an `async`
   handler sends it, and a thrown error is routed to the error handler.
4. **JSON Schema is the validation and serialization layer.** Schemas replace
   validation middleware, and they make the response faster to serialize.

### Table of contents

- [Hello world](#hello-world)
- [Routing](#routing)
- [Routers become plugins](#routers-become-plugins)
- [Request and reply cheat sheet](#request-and-reply-cheat-sheet)
- [Middleware becomes hooks](#middleware-becomes-hooks)
- [Error handling](#error-handling)
- [Not found handler](#not-found-handler)
- [Body parsing](#body-parsing)
- [Validation and serialization](#validation-and-serialization)
- [Application state: `app.locals` and `res.locals`](#application-state)
- [Server options](#server-options)
- [Logging](#logging)
- [Static files and views](#static-files-and-views)
- [Testing](#testing)
- [Middleware and plugin equivalents](#middleware-and-plugin-equivalents)
- [Migrating incrementally](#migrating-incrementally)
- [Common pitfalls](#common-pitfalls)

### Hello world
<a id="hello-world"></a>

```js
// Express
const express = require('express')
const app = express()

app.get('/', (req, res) => {
  res.json({ hello: 'world' })
})

app.listen(3000)
```

```js
// Fastify
const fastify = require('fastify')({ logger: true })

fastify.get('/', async () => {
  return { hello: 'world' }
})

await fastify.listen({ port: 3000 })
```

Two things to note:

- `listen` takes an options object, not positional arguments, and it returns a
  promise. Registering plugins is asynchronous, so `listen` (or
  [`ready`](../Reference/Server.md#ready)) is where the application boots.
- Objects are serialized as JSON automatically, so `res.json(payload)` becomes
  `return payload` (or `reply.send(payload)`).

### Routing
<a id="routing"></a>

The shorthand methods (`get`, `post`, `put`, `patch`, `delete`, `head`,
`options`, `all`) accept the same `(path, handler)` shape as Express. Path
syntax differs for wildcards and regular expressions:

| Express | Fastify |
|---------|---------|
| `/user/:id` | `/user/:id` |
| `/user/:id?` | `/user/:id?` (only the last parameter) |
| `/files/*` (Express 4) or `/files/*splat` (Express 5) | `/files/*` |
| `/user/:id(\\d+)` | `/user/:id(^\\d+$)` |
| `app.route('/book').get(..).post(..)` | two `fastify.route()` calls |

Wildcard matches are read from `request.params['*']` rather than
`req.params[0]`:

```js
// Express
app.get('/files/*', (req, res) => res.send(req.params[0]))
```

```js
// Fastify
fastify.get('/files/*', async (request) => request.params['*'])
```

Fastify has no `next('route')` and no array-of-handlers signature. Chained
middleware for a single route becomes route-level hooks, which run in order:

```js
// Express
app.post('/user', authenticate, validateUser, (req, res) => {
  res.status(201).json(req.user)
})
```

```js
// Fastify
fastify.post('/user', {
  preHandler: [authenticate, validateUser]
}, async (request, reply) => {
  reply.code(201)
  return request.user
})
```

The full [route options](../Reference/Routes.md#routes-options) object accepts
`schema`, per-route hooks, `config`, `bodyLimit`, and more. The `fastify.route`
declaration is equivalent to the shorthand:

```js
fastify.route({
  method: 'POST',
  url: '/user',
  schema: { /* ... */ },
  preHandler: [authenticate],
  handler: async (request, reply) => { /* ... */ }
})
```

> ℹ️ Note:
> Fastify's router does not allow two routes with the same method and path.
> Registering a duplicate throws at boot instead of silently shadowing the
> first one, which is a common source of surprise when porting an Express app
> that relied on ordering.

### Routers become plugins
<a id="routers-become-plugins"></a>

An Express `Router` mounted at a path becomes a plugin registered with a
`prefix`:

```js
// Express — routes/user.js
const router = require('express').Router()
router.get('/', listUsers)
router.get('/:id', getUser)
module.exports = router

// app.js
app.use('/user', require('./routes/user'))
```

```js
// Fastify — routes/user.js
module.exports = async function (fastify, opts) {
  fastify.get('/', listUsers)
  fastify.get('/:id', getUser)
}

// app.js
fastify.register(require('./routes/user'), { prefix: '/user' })
```

The plugin's first argument is a *scoped* instance of the server. Hooks,
decorators, and plugins added to it only apply inside that scope and its
children, which is how Fastify replaces the "mount middleware before the
routes that need it" pattern:

```js
// Express — an auth middleware that must be mounted in the right order
app.use('/admin', requireAdmin)
app.use('/admin', require('./routes/admin'))
```

```js
// Fastify — the hook cannot leak outside the plugin
fastify.register(async function admin (fastify) {
  fastify.addHook('onRequest', requireAdmin)
  fastify.register(require('./routes/admin'))
}, { prefix: '/admin' })
```

To share a decorator or hook with the *parent* scope on purpose, wrap the
plugin with [`fastify-plugin`](https://github.com/fastify/fastify-plugin). See
the [Plugins Guide](./Plugins-Guide.md) and
[Encapsulation](../Reference/Encapsulation.md) for details.

### Request and reply cheat sheet
<a id="request-and-reply-cheat-sheet"></a>

`request` and `reply` are Fastify objects, not the Node.js `req`/`res`. The raw
Node.js objects remain available as `request.raw` and `reply.raw`.

| Express | Fastify |
|---------|---------|
| `req.body`, `req.params`, `req.query` | same names on `request` |
| `req.headers`, `req.get('x-foo')` | `request.headers['x-foo']` |
| `req.ip`, `req.ips` | `request.ip`, `request.ips` |
| `req.protocol`, `req.hostname` | `request.protocol`, `request.hostname` |
| `req.originalUrl`, `req.path` | `request.originalUrl`, `request.url` |
| `req.method` | `request.method` |
| `res.json(obj)`, `res.send(obj)` | `reply.send(obj)` or `return obj` |
| `res.status(201).send()` | `reply.code(201).send()` |
| `res.sendStatus(204)` | `reply.code(204).send()` |
| `res.set('x-foo', 'bar')` | `reply.header('x-foo', 'bar')` |
| `res.set({ ... })` | `reply.headers({ ... })` |
| `res.type('text/html')` | `reply.type('text/html')` |
| `res.redirect('/home')` | `reply.redirect('/home')` |
| `res.redirect(301, '/home')` | `reply.redirect('/home', 301)` |
| `res.cookie(...)` | `reply.setCookie(...)` (`@fastify/cookie`) |
| `res.sendFile(...)` | `reply.sendFile(...)` (`@fastify/static`) |
| `res.render(...)` | `reply.view(...)` (`@fastify/view`) |
| `res.locals` | request decorators |
| `res.end()`, `res.write()` | `reply.raw`, or `reply.hijack()` |

`request.url` is the full path with the querystring, so it is closer to
Express' `req.originalUrl` than to `req.path`.

An `async` handler must either return the payload or `await reply.send(...)`,
never both. Returning `undefined` from an `async` handler without calling
`reply.send()` leaves the request hanging until the timeout:

```js
// Wrong: the value is returned before send() completes
fastify.get('/', async (request, reply) => {
  reply.send({ hello: 'world' })
  return 'this string is ignored and logs a warning'
})

// Right
fastify.get('/', async (request, reply) => {
  reply.code(201)
  return { hello: 'world' }
})
```

Streams, buffers, and `Response` objects can be returned or sent directly. See
[`.send(data)`](../Reference/Reply.md#senddata).

### Middleware becomes hooks
<a id="middleware-becomes-hooks"></a>

Fastify does not support Express middleware out of the box. Each middleware
maps to the [hook](../Reference/Hooks.md) that matches when it needs to run:

| Express middleware runs... | Fastify hook |
|----------------------------|--------------|
| before anything else (logging, auth by header) | `onRequest` |
| needs the parsed body (auth by body, validation) | `preHandler` |
| needs to modify the raw body stream | `preParsing` |
| needs to modify the payload before it is sent | `onSend` |
| after the response is flushed (metrics) | `onResponse` |
| on errors only | `onError` or `setErrorHandler` |

`next()` becomes `done()`, or the hook can be `async`:

```js
// Express
app.use((req, res, next) => {
  req.startTime = Date.now()
  next()
})
```

```js
// Fastify
fastify.addHook('onRequest', async (request) => {
  request.startTime = Date.now()
})
```

To short-circuit a request, send a reply from the hook (and return) instead of
calling `next()`, or throw:

```js
fastify.addHook('onRequest', async (request, reply) => {
  if (!request.headers.authorization) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
})
```

> ℹ️ Note:
> In a callback-style hook, do not call `done()` after `reply.send()`. In an
> `async` hook, `return reply` (or `await reply.send()`) so Fastify knows the
> request was handled.

#### Keeping existing middleware

When a middleware has no Fastify equivalent, register
[`@fastify/middie`](https://github.com/fastify/middie) (Connect-style
middleware, faster) or
[`@fastify/express`](https://github.com/fastify/fastify-express) (full Express
compatibility, for middleware that touches Express-specific `req`/`res`
methods):

```js
await fastify.register(require('@fastify/middie'))
fastify.use(require('some-legacy-middleware')())

// Restricted to a path prefix
fastify.use('/api', require('some-legacy-middleware')())
```

Middleware only sees the raw Node.js `req` and `res`, so it cannot use
`reply.send()` or any Fastify-specific API. Prefer native plugins for anything
on the hot path; see [Middleware](../Reference/Middleware.md).

### Error handling
<a id="error-handling"></a>

Express 4 error-handling middleware becomes
[`setErrorHandler`](../Reference/Server.md#seterrorhandler):

```js
// Express
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message })
})
```

```js
// Fastify
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  reply.code(error.statusCode ?? 500).send({ error: error.message })
})
```

Differences worth knowing:

- Fastify ships a default error handler, so this is optional. Uncaught errors
  become a `500` with a JSON body, and validation errors become a `400`.
- Errors thrown inside `async` handlers are caught automatically. In Express 4
  they had to be passed to `next(err)`; Express 5 forwards rejections too.
- `error.statusCode` is the property Fastify reads when it serializes an error.
  Libraries such as [`@fastify/error`](https://github.com/fastify/error) or
  `http-errors` set it for you.
- Error handlers are encapsulated: one registered inside a plugin only handles
  errors from that plugin's scope, which replaces the Express habit of a single
  global handler with per-router `try/catch`.

### Not found handler
<a id="not-found-handler"></a>

```js
// Express — a catch-all mounted last
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' })
})
```

```js
// Fastify
fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ error: 'Not Found' })
})
```

Ordering does not matter, and
[`setNotFoundHandler`](../Reference/Server.md#setnotfoundhandler) can be called
inside a plugin to scope it to that prefix.

### Body parsing
<a id="body-parsing"></a>

`application/json` and `text/plain` are parsed out of the box, so
`express.json()` has no counterpart to register. Other content types map to
plugins or a custom parser:

| Express | Fastify |
|---------|---------|
| `express.json()` | built in |
| `express.text()` | built in (`text/plain`) |
| `express.urlencoded()` | [`@fastify/formbody`](https://github.com/fastify/fastify-formbody) |
| `express.raw()` | `addContentTypeParser` with `parseAs: 'buffer'` |
| `multer` | [`@fastify/multipart`](https://github.com/fastify/fastify-multipart) |

```js
// Raw body for a webhook signature check
fastify.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  function (request, body, done) {
    verifySignature(request, body)
    done(null, JSON.parse(body.toString()))
  }
)
```

See [ContentTypeParser](../Reference/ContentTypeParser.md). Note that
`request.body` is `undefined` for `GET` and `HEAD` requests, and that Fastify
rejects a body with an unknown content type with a `415` instead of leaving
`req.body` empty.

### Validation and serialization
<a id="validation-and-serialization"></a>

Validation middleware (`express-validator`, `joi` middleware, hand-rolled
checks) is replaced by a JSON Schema on the route. Fastify validates the
request and returns a `400` before the handler runs:

```js
// Express with express-validator
app.post('/user',
  body('email').isEmail(),
  body('age').optional().isInt({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    res.status(201).json(createUser(req.body))
  }
)
```

```js
// Fastify
fastify.post('/user', {
  schema: {
    body: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 0 }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  reply.code(201)
  return createUser(request.body)
})
```

The `response` schema is not just documentation: it compiles a serializer that
is faster than `JSON.stringify` and strips properties that are not declared,
which prevents leaking fields such as password hashes.

Schemas also coerce types, which matters when porting code that parsed
querystring values by hand: with a `{ type: 'integer' }` property,
`request.query.page` is a number rather than a string.

Prefer a full schema (always including `type`) and use `$ref` with
[`addSchema`](../Reference/Server.md#addschema) to share definitions. Other
validators (`joi`, `yup`, `zod`) can be plugged in through
[`setValidatorCompiler`](../Reference/Validation-and-Serialization.md#schema-validator).

### Application state
<a id="application-state"></a>

`app.locals` and monkey-patching `req` become
[decorators](../Reference/Decorators.md):

```js
// Express
app.locals.db = db
app.use((req, res, next) => {
  req.user = null
  next()
})
```

```js
// Fastify
fastify.decorate('db', db)
fastify.decorateRequest('user', null)

fastify.get('/', async function (request) {
  return this.db.query('...')  // or fastify.db
})
```

Declaring the shape up front lets V8 keep a single hidden class for every
request, so decorate first and assign in a hook, rather than adding new
properties to `request` at runtime. For reference types, use a
[getter/setter or a factory](../Reference/Decorators.md#decorate-request) so
instances are not shared between requests.

`res.locals`, typically used to pass data to templates, has no direct
equivalent; put the data on a request decorator and pass it to `reply.view()`.

### Server options
<a id="server-options"></a>

Express `app.set()` calls become options on the factory:

| Express | Fastify |
|---------|---------|
| `app.set('trust proxy', true)` | `Fastify({ trustProxy: true })` |
| `app.set('case sensitive routing', false)` | `Fastify({ caseSensitive: false })` |
| `app.set('strict routing', true)` | routes are strict by default; `Fastify({ ignoreTrailingSlash: true })` relaxes it |
| `app.set('query parser', 'extended')` | `Fastify({ querystringParser: str => qs.parse(str) })` |
| `app.set('etag', ...)` | [`@fastify/etag`](https://github.com/fastify/fastify-etag) |
| `app.set('views'/'view engine', ...)` | `@fastify/view` options |

Fastify's default querystring parser does not build nested objects or arrays
the way Express' default (`qs`) does. If the application relies on
`?filter[name]=x`, pass an explicit
[`querystringParser`](../Reference/Server.md#querystringparser).

### Logging
<a id="logging"></a>

Fastify has [Pino](https://getpino.io) built in, so `morgan` and a separate
logger are usually both unnecessary. Requests and responses are logged
automatically when `logger` is enabled, and `request.log` is a child logger
bound to the request id:

```js
// Express
app.use(require('morgan')('combined'))
app.get('/', (req, res) => {
  console.log('handling request')
  res.send('ok')
})
```

```js
// Fastify
const fastify = require('fastify')({
  logger: { level: 'info' }
})

fastify.get('/', async (request) => {
  request.log.info('handling request')
  return 'ok'
})
```

See [Logging](../Reference/Logging.md) for redaction, per-route log levels, and
production configuration.

### Static files and views
<a id="static-files-and-views"></a>

```js
// Express
app.use(express.static('public'))
app.set('view engine', 'ejs')
app.get('/', (req, res) => res.render('index', { name: 'world' }))
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
  return reply.view('index.ejs', { name: 'world' })
})
```

### Testing
<a id="testing"></a>

`supertest` against a listening server can be replaced by
[`fastify.inject()`](../Reference/Server.md#inject), which routes a fake
request through the full lifecycle without binding a port:

```js
// Express
const request = require('supertest')
await request(app).get('/user/1').expect(200)
```

```js
// Fastify
const response = await fastify.inject({
  method: 'GET',
  url: '/user/1'
})
assert.strictEqual(response.statusCode, 200)
assert.deepStrictEqual(response.json(), { id: '1' })
```

Export a factory that builds the server (`buildApp()`) rather than a
module-level instance, so each test gets a fresh application. The
[Testing](./Testing.md) guide covers this pattern in detail.

### Middleware and plugin equivalents
<a id="middleware-and-plugin-equivalents"></a>

| Express middleware | Fastify plugin |
|--------------------|----------------|
| `cors` | [`@fastify/cors`](https://github.com/fastify/fastify-cors) |
| `helmet` | [`@fastify/helmet`](https://github.com/fastify/fastify-helmet) |
| `compression` | [`@fastify/compress`](https://github.com/fastify/fastify-compress) |
| `serve-static` | [`@fastify/static`](https://github.com/fastify/fastify-static) |
| `cookie-parser` | [`@fastify/cookie`](https://github.com/fastify/fastify-cookie) |
| `express-session` | [`@fastify/session`](https://github.com/fastify/session) |
| `body-parser` (urlencoded) | [`@fastify/formbody`](https://github.com/fastify/fastify-formbody) |
| `multer` | [`@fastify/multipart`](https://github.com/fastify/fastify-multipart) |
| `express-rate-limit` | [`@fastify/rate-limit`](https://github.com/fastify/fastify-rate-limit) |
| `passport` | [`@fastify/passport`](https://github.com/fastify/passport) |
| `express-jwt` | [`@fastify/jwt`](https://github.com/fastify/fastify-jwt) |
| `http-proxy-middleware` | [`@fastify/http-proxy`](https://github.com/fastify/fastify-http-proxy) |
| `swagger-ui-express` | [`@fastify/swagger`](https://github.com/fastify/fastify-swagger) |
| `morgan` | built-in Pino logger |
| `express-validator` | JSON Schema validation |

The [Ecosystem](./Ecosystem.md) guide lists core and community plugins.

### Migrating incrementally
<a id="migrating-incrementally"></a>

A large application does not have to move in one commit. Two options:

**Run Fastify inside Express.** Boot a Fastify instance without calling
`listen`, and hand matching requests to it with
[`routing`](../Reference/Server.md#routing):

```js
const express = require('express')
const Fastify = require('fastify')

const fastify = Fastify({ logger: true })
fastify.get('/users', async () => listUsers())
await fastify.ready()

const app = express()
app.use('/v2', (req, res) => fastify.routing(req, res))
app.listen(3000)
```

Express strips the mount path from `req.url`, so the Fastify routes above are
declared without the `/v2` prefix.

**Run Express inside Fastify.** Register `@fastify/express` and pass the
existing Express app as middleware, then peel routes off it:

```js
await fastify.register(require('@fastify/express'))
fastify.use(legacyExpressApp)

// New routes are native Fastify and take precedence over the middleware
fastify.get('/users', async () => listUsers())
```

The second approach is usually the better default, because new code gets the
full Fastify lifecycle immediately. Drop the compatibility layer once the last
Express route is gone: it adds overhead on every request.

### Common pitfalls
<a id="common-pitfalls"></a>

- **Returning and sending.** Do not call `reply.send()` *and* return a value
  from the same `async` handler.
- **Forgetting to await the boot.** Routes are registered when plugins load, so
  `fastify.inject()` or `fastify.hasRoute()` before `await fastify.ready()`
  will not see them.
- **Registering a plugin after `listen()`.** Boot ordering matters; register
  everything before starting the server.
- **Expecting middleware ordering to matter.** Hooks are grouped by lifecycle
  phase and encapsulation, not by source-line order across the whole app.
- **Duplicate routes.** Express takes the first match; Fastify throws at boot.
- **Missing `type` in a schema.** As of v5 a full JSON Schema is required for
  `body`, `querystring`, `params`, and `response`.
- **Mutating `request`/`reply` shapes.** Use `decorateRequest` and
  `decorateReply` instead of adding properties on the fly.
- **Assuming `req.body` is `{}`.** It is `undefined` when there is no body.
