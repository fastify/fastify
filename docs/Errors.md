<h1 align="center">Fastify</h1>

<a id="errors"></a>
## Errors

<a name="error-handling"></a>
### Error Handling In Node.js

#### Uncaught Errors
In Node.js, uncaught errors are likely to cause memory leaks, file descriptor leaks and other major production issues. [Domains](https://nodejs.org/en/docs/guides/domain-postmortem/) were introduced to try fix this issue, but did not. 

Given that it is not possible to process all uncaught errors sensibly, the best way to deal with them is to [crash](https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly). 

#### Catching Errors In Promises
In Node.js, unhandled promise rejections (that is, without a `.catch()` handler) can also cause memory and file descriptor leaks. While `unhandledRejection` is deprecated in Node.js, unhandled rejections will not throw, and still potentially leak. You should use a module like [`make-promises-safe`](https://github.com/mcollina/make-promises-safe) to ensure unhandled rejections _always_ throw.

If you are using promises, you should attach a `.catch()` handler synchronously.

### Errors In Fastify
Fastify follows an all-or-nothing approach and aims to be lean and optimal as much as possible. The developer is responsible for making sure that the errors are handled properly. 

#### Errors In Input Data
Most errors are a result of unexpected input data, so we recommend specifying a [JSON.schema validation](Validation-and-Serialization.md) for your input data.

#### Catching Uncaught Errors In Fastify
Fastify tries to catch as many uncaught errors as it can without hindering performance. This includes:

1. synchronous routes, e.g. `app.get('/', () => { throw new Error('kaboom') })`
2. `async` routes, e.g. `app.get('/', async () => { throw new Error('kaboom') })`

The error in both cases will be caught safely and routed to Fastify's default error handler for a generic `500 Internal Server Error` response. 

For customizing this behaviour, you should use [`setErrorHandler`](Server.md#seterrorhandler).

### Errors In Fastify Lifecycle Hooks And A Custom Error Handler

From the [Hooks documentation](Hooks/#manage-errors-from-a-hook): 
> If you get an error during the execution of your hook, just pass it to `done()` and Fastify will automatically close the request and send the appropriate error code to the user.

If you have defined a custom error handler for using `setErrorHandler` the error will be routed there, otherwise it will be routed to Fastify’s generic error handler. 

Some things to consider in your custom error handler: 

- you can `reply.send(data)` which will be behave as it would be in [regular route handlers](Reply/#senddata)
	- objects are serialised, triggering the `preSerialization` lifecycle hook if you have one defined
	- strings, buffers, and streams are sent to the client, with appropriate headers (no serialization)

- You can throw a new error in your custom error handler
	- errors (new error or the received error parameter re-thrown) - will trigger the `onError` lifecycle hook and send the error to the user
	- an error will not be triggered twice from a lifecycle hook - Fastify internally monitors the error invocation to avoid infinite loops for errors thrown in the reply phases of the lifecycle. (those after the route handler) 


<a name="fastify-error-codes"></a>
### Fastify Error Codes

<a name="FST_ERR_BAD_URL"></a>
#### FST_ERR_BAD_URL

The router received an invalid url.

<a name="FST_ERR_CTP_ALREADY_PRESENT"></a>
#### FST_ERR_CTP_ALREADY_PRESENT

The parser for this content type was already registered.

<a name="FST_ERR_CTP_INVALID_TYPE"></a>
#### FST_ERR_CTP_INVALID_TYPE

The `Content-Type` should be a string.

<a name="FST_ERR_CTP_EMPTY_TYPE"></a>
#### FST_ERR_CTP_EMPTY_TYPE

The content type cannot be an empty string.

<a name="FST_ERR_CTP_INVALID_HANDLER"></a>
#### FST_ERR_CTP_INVALID_HANDLER

An invalid handler was passed for the content type.

<a name="FST_ERR_CTP_INVALID_PARSE_TYPE"></a>
#### FST_ERR_CTP_INVALID_PARSE_TYPE

The provided parse type is not supported. Accepted values are `string` or `buffer`.

<a name="FST_ERR_CTP_BODY_TOO_LARGE"></a>
#### FST_ERR_CTP_BODY_TOO_LARGE

The request body is larger than the provided limit.

<a name="FST_ERR_CTP_INVALID_MEDIA_TYPE"></a>
#### FST_ERR_CTP_INVALID_MEDIA_TYPE

The received media type is not supported (i.e. there is no suitable `Content-Type` parser for it).

<a name="FST_ERR_CTP_INVALID_CONTENT_LENGTH"></a>
#### FST_ERR_CTP_INVALID_CONTENT_LENGTH

Request body size did not match Content-Length.

<a name="FST_ERR_DEC_ALREADY_PRESENT"></a>
#### FST_ERR_DEC_ALREADY_PRESENT

A decorator with the same name is already registered.

<a name="FST_ERR_DEC_MISSING_DEPENDENCY"></a>
#### FST_ERR_DEC_MISSING_DEPENDENCY

The decorator cannot be registered due to a missing dependency.

<a name="FST_ERR_HOOK_INVALID_TYPE"></a>
#### FST_ERR_HOOK_INVALID_TYPE

The hook name must be a string.

<a name="FST_ERR_HOOK_INVALID_HANDLER"></a>
#### FST_ERR_HOOK_INVALID_HANDLER

The hook callback must be a function.

<a name="FST_ERR_LOG_INVALID_DESTINATION"></a>
#### FST_ERR_LOG_INVALID_DESTINATION

The logger accepts either a `'stream'` or a `'file'` as the destination.

<a id="FST_ERR_REP_ALREADY_SENT"></a>
#### FST_ERR_REP_ALREADY_SENT

A response was already sent.

<a id="FST_ERR_SEND_INSIDE_ONERR"></a>
#### FST_ERR_SEND_INSIDE_ONERR

You cannot use `send` inside the `onError` hook.

<a name="FST_ERR_REP_INVALID_PAYLOAD_TYPE"></a>
#### FST_ERR_REP_INVALID_PAYLOAD_TYPE

Reply payload can either be a `string` or a `Buffer`.

<a name="FST_ERR_SCH_MISSING_ID"></a>
#### FST_ERR_SCH_MISSING_ID

The schema provided does not have `$id` property.

<a name="FST_ERR_SCH_ALREADY_PRESENT"></a>
#### FST_ERR_SCH_ALREADY_PRESENT

A schema with the same `$id` already exists.

<a name="FST_ERR_SCH_VALIDATION_BUILD"></a>
#### FST_ERR_SCH_VALIDATION_BUILD

The JSON schema provided for validation to a route is not valid.

<a name="FST_ERR_SCH_SERIALIZATION_BUILD"></a>
#### FST_ERR_SCH_SERIALIZATION_BUILD

The JSON schema provided for serialization of a route response is not valid.

<a name="FST_ERR_PROMISE_NOT_FULLFILLED"></a>
#### FST_ERR_PROMISE_NOT_FULLFILLED

A promise may not be fulfilled with 'undefined' when statusCode is not 204.

<a name="FST_ERR_SEND_UNDEFINED_ERR"></a>
#### FST_ERR_SEND_UNDEFINED_ERR

Undefined error has occurred.
