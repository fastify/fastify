---
title: Errors
---

### Error Handling
<a id="error-handling"></a>

Uncaught errors are likely to cause memory leaks, file descriptor leaks and other major production issues. [Domains](https://nodejs.org/en/docs/guides/domain-postmortem/) were introduced to try fixing this issue, but they did not. Given the fact that it is not possible to process all uncaught errors sensibly, the best way to deal with them at the moment is to [crash](https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly). In case of promises, make sure to [handle](https://nodejs.org/dist/latest-v8.x/docs/api/deprecations.html#deprecations_dep0018_unhandled_promise_rejections) errors [correctly](https://github.com/mcollina/make-promises-safe).

Fastify follows an all-or-nothing approach and aims to be lean and optimal as much as possible. Thus, the developer is responsible for making sure that the errors are handled properly. Most of the errors are usually a result of unexpected input data, so we recommend specifying a [JSON.schema validation](./Validation-and-Serialization.md) for your input data.

Note that Fastify doesn't catch uncaught errors within callback-based routes for you, so any uncaught errors will result in a crash.
If routes are declared as `async` though - the error will safely be caught by the promise and routed to the default error handler of Fastify for a generic `Internal Server Error` response. For customizing this behaviour, you should use [setErrorHandler](./Server.md#seterrorhandler).

### Fastify Error Codes
<a id="fastify-error-codes"></a>

#### FST_ERR_BAD_URL
<a id="FST_ERR_BAD_URL"></a>

The router received an invalid url.

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

The provided parse type is not supported. Accepted values are `string` or `buffer`.

#### FST_ERR_CTP_BODY_TOO_LARGE
<a id="FST_ERR_CTP_BODY_TOO_LARGE"></a>

The request body is larger than the provided limit.

#### FST_ERR_CTP_INVALID_MEDIA_TYPE
<a id="FST_ERR_CTP_INVALID_MEDIA_TYPE"></a>

The received media type is not supported (i.e. there is no suitable `Content-Type` parser for it).

#### FST_ERR_CTP_INVALID_CONTENT_LENGTH
<a id="FST_ERR_CTP_INVALID_CONTENT_LENGTH"></a>

Request body size did not match Content-Length.

#### FST_ERR_DEC_ALREADY_PRESENT
<a id="FST_ERR_DEC_ALREADY_PRESENT"></a>

A decorator with the same name is already registered.

#### FST_ERR_DEC_MISSING_DEPENDENCY
<a id="FST_ERR_DEC_MISSING_DEPENDENCY"></a>

The decorator cannot be registered due to a missing dependency.

#### FST_ERR_HOOK_INVALID_TYPE
<a id="FST_ERR_HOOK_INVALID_TYPE"></a>

The hook name must be a string.

#### FST_ERR_HOOK_INVALID_HANDLER
<a id="FST_ERR_HOOK_INVALID_HANDLER"></a>

The hook callback must be a function.

#### FST_ERR_LOG_INVALID_DESTINATION
<a id="FST_ERR_LOG_INVALID_DESTINATION"></a>

The logger accepts either a `'stream'` or a `'file'` as the destination.

#### FST_ERR_REP_ALREADY_SENT
<a id="FST_ERR_REP_ALREADY_SENT"></a>

A response was already sent.

#### FST_ERR_SEND_INSIDE_ONERR
<a id="FST_ERR_SEND_INSIDE_ONERR"></a>

You cannot use `send` inside the `onError` hook.

#### FST_ERR_REP_INVALID_PAYLOAD_TYPE
<a id="FST_ERR_REP_INVALID_PAYLOAD_TYPE"></a>

Reply payload can either be a `string` or a `Buffer`.

#### FST_ERR_SCH_MISSING_ID
<a id="FST_ERR_SCH_MISSING_ID"></a>

The schema provided does not have `$id` property.

#### FST_ERR_SCH_ALREADY_PRESENT
<a id="FST_ERR_SCH_ALREADY_PRESENT"></a>

A schema with the same `$id` already exists.

#### FST_ERR_SCH_NOT_PRESENT
<a id="FST_ERR_SCH_NOT_PRESENT"></a>

No schema with the provided `$id` exists.

#### FST_ERR_SCH_BUILD
<a id="FST_ERR_SCH_BUILD"></a>

The JSON schema provided to one route is not valid.

#### FST_ERR_PROMISE_NOT_FULLFILLED
<a id="FST_ERR_PROMISE_NOT_FULLFILLED"></a>

A promise may not be fulfilled with 'undefined' when statusCode is not 204.

#### FST_ERR_SEND_UNDEFINED_ERR
<a id="FST_ERR_SEND_UNDEFINED_ERR"></a>

Undefined error has occured.
