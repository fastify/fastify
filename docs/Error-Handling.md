<h1 align="center">Fastify</h1>

## Error classification in Promises & Async/Await

Fastify classified errors in two different groups.

- `System` any instance of type `EvalError`, `RangeError`, `ReferenceError`, `SyntaxError`, `TypeError`, `URIError` or `AssertionError`
- `Business` any instance of type `Error`

### Background

With the use of `promises` and `async/await` we are able to catch **any** synchronous error and respond it back to the callee doesn't matter whether it's correct behavior or a syntax error. This is an anti-pattern because any unpredictable application state should exit your server so that it can come back in a clear state. This is useful for debugging and can prevent you from memory-leaks.
In NodeJs it's very common to derivate from the `Error` type to build your own error hierachy. If you looking for a solution to work with http status codes we recommend [http-errors](https://github.com/jshttp/http-errors).

When a `system` error is thrown you have to declare a [`process.on(unhandledRejection)`](https://nodejs.org/api/process.html#process_event_unhandledrejection) listener and exit the process otherwise your will get an error log like this `Unhandled promise rejection (rejection id: 1): ReferenceError: meow is not defined`. In order to simplify this you can use [make-promises-safe](https://github.com/mcollina/make-promises-safe).

Example:
```js
const createError = require('http-errors')
fastify.get('/', opts, (req, reply) => {
  reply.send(createError.NotFound()) // 404
})
```
