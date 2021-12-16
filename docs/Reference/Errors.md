<h1 align="center">Fastify</h1>

## Errors
<a id="errors"></a>

### Error Handling In Node.js
<a id="error-handling"></a>

#### Uncaught Errors
In Node.js, uncaught errors are likely to cause memory leaks, file descriptor
leaks, and other major production issues.
[Domains](https://nodejs.org/en/docs/guides/domain-postmortem/) were a failed
attempt to fix this.

Given that it is not possible to process all uncaught errors sensibly, the best
way to deal with them is to
[crash](https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly).

#### Catching Errors In Promises
In Node.js, unhandled promise rejections (that is, without a `.catch()` handler)
can also cause memory and file descriptor leaks. While `unhandledRejection` is
deprecated in Node.js, unhandled rejections will not throw, and still
potentially leak. You should use a module like
[`make-promises-safe`](https://github.com/mcollina/make-promises-safe) to ensure
unhandled rejections _always_ throw.

If you are using promises, you should attach a `.catch()` handler synchronously.

### Errors In Fastify
Fastify follows an all-or-nothing approach and aims to be lean and optimal as
much as possible. The developer is responsible for making sure that the errors
are handled properly.

#### Errors In Input Data
Most errors are a result of unexpected input data, so we recommend [validating
your input data against a JSON schema](./Validation-and-Serialization.md).

#### Catching Uncaught Errors In Fastify
Fastify tries to catch as many uncaught errors as it can without hindering
performance. This includes:

1. synchronous routes, e.g. `app.get('/', () => { throw new Error('kaboom') })`
2. `async` routes, e.g. `app.get('/', async () => { throw new Error('kaboom')
   })`

The error in both cases will be caught safely and routed to Fastify's default
error handler for a generic `500 Internal Server Error` response.

To customize this behavior you should use
[`setErrorHandler`](./Server.md#seterrorhandler).

### Errors In Fastify Lifecycle Hooks And A Custom Error Handler

From the [Hooks documentation](./Hooks.md#manage-errors-from-a-hook):
> If you get an error during the execution of your hook, just pass it to
> `done()` and Fastify will automatically close the request and send the
> appropriate error code to the user.

If you have defined a custom error handler for using `setErrorHandler` the error
will be routed there. otherwise, it will be routed to Fastify’s generic error
handler.

Some things to consider in your custom error handler:

- you can `reply.send(data)`, which will behave as it would in [regular route
  handlers](./Reply.md#senddata)
  - objects are serialized, triggering the `preSerialization` lifecycle hook if
    you have one defined
  - strings, buffers, and streams are sent to the client, with appropriate
    headers (no serialization)

- You can throw a new error in your custom error handler
  - errors (new error or the received error parameter re-thrown) - will trigger
    the `onError` lifecycle hook and send the error to the user
  - an error will not be triggered twice from a lifecycle hook - Fastify
    internally monitors the error invocation to avoid infinite loops for errors
    thrown in the reply phases of the lifecycle. (those after the route handler)


### Fastify Error Codes
<a id="fastify-error-codes"></a>

#### FST_ERR_BAD_URL
<a id="FST_ERR_BAD_URL"></a>

The router received an invalid url.

#### FST_ERR_CTP_ALREADY_PRESENT
<a id="FST_ERR_CTP_ALREADY_PRESENT"></a>

The parser for this content type was already registered.

#### FST_ERR_CTP_BODY_TOO_LARGE
<a id="FST_ERR_CTP_BODY_TOO_LARGE"></a>

The request body is larger than the provided limit.

This setting can be defined in the Fastify server instance:
[`bodyLimit`](./Server.md#bodylimit)

#### FST_ERR_CTP_EMPTY_TYPE
<a id="FST_ERR_CTP_EMPTY_TYPE"></a>

The content type cannot be an empty string.

#### FST_ERR_CTP_INVALID_CONTENT_LENGTH
<a id="FST_ERR_CTP_INVALID_CONTENT_LENGTH"></a>

Request body size did not match Content-Length.

#### FST_ERR_CTP_INVALID_HANDLER
<a id="FST_ERR_CTP_INVALID_HANDLER"></a>

An invalid handler was passed for the content type.

#### FST_ERR_CTP_INVALID_MEDIA_TYPE
<a id="FST_ERR_CTP_INVALID_MEDIA_TYPE"></a>

The received media type is not supported (i.e. there is no suitable
`Content-Type` parser for it).

#### FST_ERR_CTP_INVALID_PARSE_TYPE
<a id="FST_ERR_CTP_INVALID_PARSE_TYPE"></a>

The provided parse type is not supported. Accepted values are `string` or
`buffer`.

#### FST_ERR_CTP_INVALID_TYPE
<a id="FST_ERR_CTP_INVALID_TYPE"></a>

The `Content-Type` should be a string.

#### FST_ERR_DEC_ALREADY_PRESENT
<a id="FST_ERR_DEC_ALREADY_PRESENT"></a>

A decorator with the same name is already registered.

#### FST_ERR_DEC_MISSING_DEPENDENCY
<a id="FST_ERR_DEC_MISSING_DEPENDENCY"></a>

The decorator cannot be registered due to a missing dependency.

#### FST_ERR_HOOK_INVALID_HANDLER
<a id="FST_ERR_HOOK_INVALID_HANDLER"></a>

The hook callback must be a function.

#### FST_ERR_HOOK_INVALID_TYPE
<a id="FST_ERR_HOOK_INVALID_TYPE"></a>

The hook name must be a string.

#### FST_ERR_LOG_INVALID_DESTINATION
<a id="FST_ERR_LOG_INVALID_DESTINATION"></a>

The logger accepts either a `'stream'` or a `'file'` as the destination.

#### FST_ERR_PROMISE_NOT_FULFILLED
<a id="FST_ERR_PROMISE_NOT_FULFILLED"></a>

A promise may not be fulfilled with 'undefined' when statusCode is not 204.

#### FST_ERR_REP_ALREADY_SENT
<a id="FST_ERR_REP_ALREADY_SENT"></a>

A response was already sent.

#### FST_ERR_REP_INVALID_PAYLOAD_TYPE
<a id="FST_ERR_REP_INVALID_PAYLOAD_TYPE"></a>

Reply payload can be either a `string` or a `Buffer`.

#### FST_ERR_SCH_ALREADY_PRESENT
<a id="FST_ERR_SCH_ALREADY_PRESENT"></a>

A schema with the same `$id` already exists.

#### FST_ERR_SCH_MISSING_ID
<a id="FST_ERR_SCH_MISSING_ID"></a>

The schema provided does not have `$id` property.

#### FST_ERR_SCH_SERIALIZATION_BUILD
<a id="FST_ERR_SCH_SERIALIZATION_BUILD"></a>

The JSON schema provided for serialization of a route response is not valid.

#### FST_ERR_SCH_VALIDATION_BUILD
<a id="FST_ERR_SCH_VALIDATION_BUILD"></a>

The JSON schema provided for validation to a route is not valid.

#### FST_ERR_SEND_INSIDE_ONERR
<a id="FST_ERR_SEND_INSIDE_ONERR"></a>

You cannot use `send` inside the `onError` hook.

#### FST_ERR_SEND_UNDEFINED_ERR
<a id="FST_ERR_SEND_UNDEFINED_ERR"></a>

Undefined error has occurred.
