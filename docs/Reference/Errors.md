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

When a custom error handler has been defined through
[`setErrorHandler`](./Server.md#seterrorhandler), the custom error handler will
receive the error passed to the `done()` callback (or through other supported
automatic error handling mechanisms). If `setErrorHandler` has been used
multiple times to define multiple handlers, the error will be routed to the most
precedent handler defined within the error [encapsulation
context](./Encapsulation.md). Error handlers are fully encapsulated, so a
`setErrorHandler` call within a plugin will limit the error handler to that
plugin's context.

The root error handler is Fastify's generic error handler. This error handler
will use the headers and status code in the `Error` object, if they exist. The
headers and status code will not be automatically set if a custom error handler
is provided.

Some things to consider in your custom error handler:

- you can `reply.send(data)`, which will behave as it would in [regular route
  handlers](./Reply.md#senddata)
  - objects are serialized, triggering the `preSerialization` lifecycle hook if
    you have one defined
  - strings, buffers, and streams are sent to the client, with appropriate
    headers (no serialization)

- You can throw a new error in your custom error handler - errors (new error or
	the received error parameter re-thrown) - will call the parent `errorHandler`.
  - `onError` hook will be triggered once only for the first error being thrown.
  - an error will not be triggered twice from a lifecycle hook - Fastify
    internally monitors the error invocation to avoid infinite loops for errors
    thrown in the reply phases of the lifecycle. (those after the route handler)

### Fastify Error Codes
<a id="fastify-error-codes"></a>

You can access `errorCodes` for mapping:
```js
// ESM
import { errorCodes } from 'fastify'

// CommonJs
const errorCodes = require('fastify').errorCodes
```

For example:
```js
const Fastify = require('./fastify')

// Instantiate the framework
const fastify = Fastify({
  logger: true
})

// Declare a route
fastify.get('/', function (request, reply) {
  reply.code('bad status code').send({ hello: 'world' })
})

fastify.setErrorHandler(function (error, request, reply) {
  if (error instanceof Fastify.errorCodes.FST_ERR_BAD_STATUS_CODE) {
    // Log error
    this.log.error(error)
    // Send error response
    reply.status(500).send({ ok: false })
  } else {
    // fastify will use parent error handler to handle this
    reply.send(error)
  }
})

// Run the server!
fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})
```

#### FST_ERR_NOT_FOUND
<a id="FST_ERR_NOT_FOUND"></a>

404 Not Found.

<a name="FST_ERR_CTP_ALREADY_PRESENT"></a>
#### FST_ERR_CTP_ALREADY_PRESENT
<a id="FST_ERR_CTP_ALREADY_PRESENT"></a>

The parser for this content type was already registered.

#### FST_ERR_CTP_INVALID_TYPE
<a id="FST_ERR_CTP_INVALID_TYPE"></a>

The `Content-Type` should be a string.

#### FST_ERR_CTP_EMPTY_TYPE
<a id="FST_ERR_CTP_EMPTY_TYPE"></a>

The content type cannot be an empty string.

#### FST_ERR_CTP_INVALID_HANDLER
<a id="FST_ERR_CTP_INVALID_HANDLER"></a>

An invalid handler was passed for the content type.

#### FST_ERR_CTP_INVALID_PARSE_TYPE
<a id="FST_ERR_CTP_INVALID_PARSE_TYPE"></a>

The provided parse type is not supported. Accepted values are `string` or
`buffer`.

#### FST_ERR_CTP_BODY_TOO_LARGE
<a id="FST_ERR_CTP_BODY_TOO_LARGE"></a>

The request body is larger than the provided limit.

This setting can be defined in the Fastify server instance:
[`bodyLimit`](./Server.md#bodylimit)

#### FST_ERR_CTP_INVALID_MEDIA_TYPE
<a id="FST_ERR_CTP_INVALID_MEDIA_TYPE"></a>

The received media type is not supported (i.e. there is no suitable
`Content-Type` parser for it).

#### FST_ERR_CTP_INVALID_CONTENT_LENGTH
<a id="FST_ERR_CTP_INVALID_CONTENT_LENGTH"></a>

Request body size did not match `Content-Length`.

#### FST_ERR_CTP_EMPTY_JSON_BODY
<a id="FST_ERR_CTP_EMPTY_JSON_BODY"></a>

Body cannot be empty when content-type is set to `application/json`.

#### FST_ERR_DEC_ALREADY_PRESENT
<a id="FST_ERR_DEC_ALREADY_PRESENT"></a>

A decorator with the same name is already registered.

#### FST_ERR_DEC_DEPENDENCY_INVALID_TYPE
<a id="FST_ERR_DEC_DEPENDENCY_INVALID_TYPE"></a>

The dependencies of decorator must be of type `Array`.

#### FST_ERR_DEC_MISSING_DEPENDENCY
<a id="FST_ERR_DEC_MISSING_DEPENDENCY"></a>

The decorator cannot be registered due to a missing dependency.

#### FST_ERR_DEC_AFTER_START
<a id="FST_ERR_DEC_AFTER_START"></a>

The decorator cannot be added after start.

#### FST_ERR_HOOK_INVALID_TYPE
<a id="FST_ERR_HOOK_INVALID_TYPE"></a>

The hook name must be a string.

#### FST_ERR_HOOK_INVALID_HANDLER
<a id="FST_ERR_HOOK_INVALID_HANDLER"></a>

The hook callback must be a function.

#### FST_ERR_MISSING_MIDDLEWARE
<a id="FST_ERR_MISSING_MIDDLEWARE"></a>

You must register a plugin for handling middlewares, 
visit [`Middleware`](./Middleware.md) for more info.

<a name="FST_ERR_HOOK_TIMEOUT"></a>
#### FST_ERR_HOOK_TIMEOUT

A callback for a hook timed out

#### FST_ERR_LOG_INVALID_DESTINATION
<a id="FST_ERR_LOG_INVALID_DESTINATION"></a>

The logger accepts either a `'stream'` or a `'file'` as the destination.

#### FST_ERR_REP_INVALID_PAYLOAD_TYPE
<a id="FST_ERR_REP_INVALID_PAYLOAD_TYPE"></a>

Reply payload can be either a `string` or a `Buffer`.

#### FST_ERR_REP_ALREADY_SENT
<a id="FST_ERR_REP_ALREADY_SENT"></a>

A response was already sent.

#### FST_ERR_REP_SENT_VALUE
<a id="FST_ERR_REP_SENT_VALUE"></a>

The only possible value for `reply.sent` is `true`.

#### FST_ERR_SEND_INSIDE_ONERR
<a id="FST_ERR_SEND_INSIDE_ONERR"></a>

You cannot use `send` inside the `onError` hook.

#### FST_ERR_SEND_UNDEFINED_ERR
<a id="FST_ERR_SEND_UNDEFINED_ERR"></a>

Undefined error has occurred.

#### FST_ERR_BAD_STATUS_CODE
<a id="FST_ERR_BAD_STATUS_CODE"></a>

Called `reply` with an invalid status code.

#### FST_ERR_BAD_TRAILER_NAME
<a id="FST_ERR_BAD_TRAILER_NAME"></a>

Called `reply.trailer` with an invalid header name.

#### FST_ERR_BAD_TRAILER_VALUE
<a id="FST_ERR_BAD_TRAILER_VALUE"></a>

Called `reply.trailer` with an invalid type. Expected a function.

#### FST_ERR_MISSING_SERIALIZATION_FN
<a id="FST_ERR_MISSING_SERIALIZATION_FN"></a>

Missing serialization function.

#### FST_ERR_REQ_INVALID_VALIDATION_INVOCATION
<a id="FST_ERR_REQ_INVALID_VALIDATION_INVOCATION"></a>

Invalid validation invocation. Missing validation function for 
HTTP part nor schema provided.

#### FST_ERR_SCH_MISSING_ID
<a id="FST_ERR_SCH_MISSING_ID"></a>

The schema provided does not have `$id` property.

#### FST_ERR_SCH_ALREADY_PRESENT
<a id="FST_ERR_SCH_ALREADY_PRESENT"></a>

A schema with the same `$id` already exists.

#### FST_ERR_SCH_DUPLICATE
<a id="FST_ERR_SCH_DUPLICATE"></a>

Schema with the same `$id` already present!

#### FST_ERR_SCH_VALIDATION_BUILD
<a id="FST_ERR_SCH_VALIDATION_BUILD"></a>

The JSON schema provided for validation to a route is not valid.

#### FST_ERR_SCH_SERIALIZATION_BUILD
<a id="FST_ERR_SCH_SERIALIZATION_BUILD"></a>

The JSON schema provided for serialization of a route response is not valid.

#### FST_ERR_HTTP2_INVALID_VERSION
<a id="FST_ERR_HTTP2_INVALID_VERSION"></a>

HTTP2 is available only from node >= 8.8.1.

#### FST_ERR_INIT_OPTS_INVALID
<a id="FST_ERR_INIT_OPTS_INVALID"></a>

Invalid initialization options.

#### FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE
<a id="FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE"></a>

Cannot set forceCloseConnections to `idle` as your HTTP server 
does not support `closeIdleConnections` method.

<a name="FST_ERR_DUPLICATED_ROUTE"></a>
#### FST_ERR_DUPLICATED_ROUTE

The HTTP method already has a registered controller for that URL

#### FST_ERR_BAD_URL
<a id="FST_ERR_BAD_URL"></a>

The router received an invalid url.

### FST_ERR_ASYNC_CONSTRAINT
<a id="FST_ERR_ASYNC_CONSTRAINT"></a>

The router received an error when using asynchronous constraints.

#### FST_ERR_DEFAULT_ROUTE_INVALID_TYPE
<a id="FST_ERR_DEFAULT_ROUTE_INVALID_TYPE"></a>

The `defaultRoute` type should be a function.

#### FST_ERR_INVALID_URL
<a id="FST_ERR_INVALID_URL"></a>

URL must be a string.

#### FST_ERR_REOPENED_CLOSE_SERVER
<a id="FST_ERR_REOPENED_CLOSE_SERVER"></a>

Fastify has already been closed and cannot be reopened.

#### FST_ERR_REOPENED_SERVER
<a id="FST_ERR_REOPENED_SERVER"></a>

Fastify is already listening.

#### FST_ERR_PLUGIN_VERSION_MISMATCH
<a id="FST_ERR_PLUGIN_VERSION_MISMATCH"></a>

Installed Fastify plugin mismatched expected version.

<a name="FST_ERR_PLUGIN_CALLBACK_NOT_FN"></a>
#### FST_ERR_PLUGIN_CALLBACK_NOT_FN

Callback for a hook is not a function (mapped directly from `avvio`)

<a name="FST_ERR_PLUGIN_NOT_VALID"></a>
#### FST_ERR_PLUGIN_NOT_VALID

Plugin must be a function or a promise.

<a name="FST_ERR_ROOT_PLG_BOOTED"></a>
#### FST_ERR_ROOT_PLG_BOOTED

Root plugin has already booted (mapped directly from `avvio`)

<a name="FST_ERR_PARENT_PLUGIN_BOOTED"></a>
#### FST_ERR_PARENT_PLUGIN_BOOTED

Impossible to load plugin because the parent (mapped directly from `avvio`)

<a name="FST_ERR_PLUGIN_TIMEOUT"></a>
#### FST_ERR_PLUGIN_TIMEOUT

Plugin did not start in time. Default timeout (in millis): `10000`
