<h1 align="center">Fastify</h1>

## Error classification in Promises & Async/Await

Fastify classified errors in two different groups.

- `System` any instance of type `EvalError`, `RangeError`, `ReferenceError`, `SyntaxError`, `TypeError`, `URIError` or `AssertionError`
- `Business` any instance of type `Error`

The main difference between those errors are that `System` errors are handled by fastify and result in an [`unhandled rejection`](#unhandled-rejections).

### Background

With the use of `promises` and `async/await` we are able to catch **any** synchronous error and respond it back to the callee doesn't matter whether it's correct behavior or a syntax error. This is an anti-pattern because any unpredictable application state should exit your server so that it can come back in a clear state. This is useful for debugging and can prevent you from memory-leaks.
In Node.js it's very common to derivate from the `Error` type to build your own error hierachy. If you looking for a solution to work with http status codes we recommend [http-errors](https://github.com/jshttp/http-errors).

Example:
```js
const createError = require('http-errors')
fastify.get('/', opts, (req, reply) => {
  reply.send(createError.NotFound()) // 404
})
```

### Unhandled rejections
When a `System` error is thrown or a `.catch()` handler was missed you should declare a [`process.on('unhandledRejection')`](https://nodejs.org/api/process.html#process_event_unhandledrejection) listener and exit the process with the error otherwise your will get an error log like this `Unhandled promise rejection (rejection id: 1): ReferenceError: meow is not defined`. In order to simplify this you can use [make-promises-safe](https://github.com/mcollina/make-promises-safe). The "soft" behaviour of unhandled rejections is already deprecated [DEP0018](https://nodejs.org/dist/latest-v8.x/docs/api/deprecations.html#deprecations_dep0018_unhandled_promise_rejections) and will exit the process in future Node.js versions.

Example:
```js
require('make-promises-safe')
fastify.get('/', opts, async (req, reply) => {
  throw new SyntaxError()
})
fastify.get('/', async (req, reply) => {
  await meow
})
```
