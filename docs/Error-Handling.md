<h1 align="center">Fastify</h1>

## Error Handling

Uncaught errors are likely to cause memory leaks, file descriptor leaks and other major production issues. [Domains](https://nodejs.org/en/docs/guides/domain-postmortem/) were introduced to try fixing this issue, but they did not. Given the fact that it is not possible to process all uncaught errors in a sensible way, the best way to deal with them at the moment is to [crash](https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly). In case of promises, make sure to [handle](https://nodejs.org/dist/latest-v8.x/docs/api/deprecations.html#deprecations_dep0018_unhandled_promise_rejections) errors [correctly](https://github.com/mcollina/make-promises-safe).

Fastify follows an all-or-nothing approach and aims to be lean and optimal as much as possible. Thus, the developer is responsible for making sure that the errors are handled properly. Most of the errors are usually a result of unexpected input data, so we recommend specifying a [JSON.schema validation](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md) for your input data.

Note that, while Fastify doesn't catch uncaught errors for you, if routes are declared as `async`, the error will safely be caught by the promise and routed to the default error handler of Fastify for a generic `Internal Server Error` response. For customizing this behaviour, you should use [setErrorHandler](https://github.com/fastify/fastify/blob/master/docs/Server.md#seterrorhandler).
