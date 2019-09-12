<h1 align="center">Fastify</h1>

<a id="errors"></a>
## Errors

<a name="error-handling"></a>
### Error Handling

Uncaught errors are likely to cause memory leaks, file descriptor leaks and other major production issues. [Domains](https://nodejs.org/en/docs/guides/domain-postmortem/) were introduced to try fixing this issue, but they did not. Given the fact that it is not possible to process all uncaught errors sensibly, the best way to deal with them at the moment is to [crash](https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly). In case of promises, make sure to [handle](https://nodejs.org/dist/latest-v8.x/docs/api/deprecations.html#deprecations_dep0018_unhandled_promise_rejections) errors [correctly](https://github.com/mcollina/make-promises-safe).

Fastify follows an all-or-nothing approach and aims to be lean and optimal as much as possible. Thus, the developer is responsible for making sure that the errors are handled properly. Most of the errors are usually a result of unexpected input data, so we recommend specifying a [JSON.schema validation](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md) for your input data.

Note that Fastify doesn't catch uncaught errors within callback-based routes for you, so any uncaught errors will result in a crash.
If routes are declared as `async` though - the error will safely be caught by the promise and routed to the default error handler of Fastify for a generic `Internal Server Error` response. For customizing this behaviour, you should use [setErrorHandler](https://github.com/fastify/fastify/blob/master/docs/Server.md#seterrorhandler).

<a name="fastify-error-codes"></a>
### Fastify Error Codes

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
### FST_ERR_REP_ALREADY_SENT

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

<a name="FST_ERR_SCH_NOT_PRESENT"></a>
#### FST_ERR_SCH_NOT_PRESENT

No schema with the provided `$id` exists.

<a name="FST_ERR_SCH_BUILD"></a>
#### FST_ERR_SCH_BUILD

The JSON schema provided to one route is not valid.

<a name="FST_ERR_PROMISE_NOT_FULLFILLED"></a>
#### FST_ERR_PROMISE_NOT_FULLFILLED

A promise may not be fulfilled with 'undefined' when statusCode is not 204.
