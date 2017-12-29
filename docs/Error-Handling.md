<h1 align="center">Fastify</h1>

## System errors

Fastify classified errors in two different groups.

- `System` any instance of type `EvalError`, `RangeError`, `ReferenceError`, `SyntaxError`, `TypeError`, `URIError` or `AssertionError`
- `Business` any instance of type `Error`

### Background

With the use of `promises` and `async/await` we are able to catch **any** synchronous error and respond it back to the callee doesn't matter whether it's correct behavior or a syntax error. This is an anti-pattern because any unpredictable application state should exit your server so that it can come back in a clear state. This useful for debugging and can prevent you from memory-leaks.
In NodeJs it's common to derivate from the `Error` type to build your own error hierachy. If you looking for a solution to work with http status codes we recommend [http-errors](https://github.com/jshttp/http-errors).

Example:
```js
const createError = require('http-errors')
fastify.get('/', opts, (req, reply) => {
  reply.send(createError.NotFound()) // 404
})
```
