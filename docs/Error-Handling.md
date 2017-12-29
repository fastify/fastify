<h1 align="center">Fastify</h1>

## System errors

Fastify classified errors in two different groups.

- `System` any instance of type `EvalError`, `RangeError`, `ReferenceError`, `SyntaxError`, `TypeError`, `URIError` or `AssertionError`
- `Business` any instance of type `Error`

### Background

With the use of `promises` and `async / await` we are able to catch **any** synchronous error doesn't matter whether it's correct behavior or an javascript error. This is anti-pattern because any unpredictable application state should exit your server so that it can come back in a clear state. This useful for debugging and can prevent you from memory-leaks.
In NodeJs it's common to derivate from the `Error` type to build your own error hierachy.
