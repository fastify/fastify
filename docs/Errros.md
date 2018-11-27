<h1 align="center">Fastify</h1>

<a id="fastify-error-codes"></a>
## Fastify Error Codes

<a id="FST_ERR_CTP_ALREADY_PRESENT"></a>
### FST_ERR_CTP_ALREADY_PRESENT

The parser for this content type was already registered.

<a id="FST_ERR_CTP_INVALID_TYPE"></a>
### FST_ERR_CTP_INVALID_TYPE

The content type should be a string.

<a id="FST_ERR_CTP_EMPTY_TYPE"></a>
### FST_ERR_CTP_EMPTY_TYPE

The content type cannot be an empty string.

<a id="FST_ERR_CTP_INVALID_HANDLER"></a>
### FST_ERR_CTP_INVALID_HANDLER

An invalid handler was passed for the content type.

<a id="FST_ERR_CTP_INVALID_PARSE_TYPE"></a>
### FST_ERR_CTP_INVALID_PARSE_TYPE

The provided parse type is not supported. Accepted values are `string` or `buffer`.

<a id="FST_ERR_CTP_BODY_TOO_LARGE"></a>
### FST_ERR_CTP_BODY_TOO_LARGE

Request body is larger than the provided limit.

<a id="FST_ERR_CTP_INVALID_MEDIA_TYPE"></a>
### FST_ERR_CTP_INVALID_MEDIA_TYPE

Received media type is not supported (i.e. there is no suitable content-type parser for it).

<a id="FST_ERR_CTP_INVALID_CONTENT_LENGTH"></a>
### FST_ERR_CTP_INVALID_CONTENT_LENGTH

Request body size did not match Content-Length.

<a id="FST_ERR_DEC_ALREADY_PRESENT"></a>
### FST_ERR_DEC_ALREADY_PRESENT

A decorator with the same name is already registered.

<a id="FST_ERR_DEC_MISSING_DEPENDENCY"></a>
### FST_ERR_DEC_MISSING_DEPENDENCY

The decorator cannot be registered due to a missing dependency.

<a id="FST_ERR_HOOK_INVALID_TYPE"></a>
### FST_ERR_HOOK_INVALID_TYPE

The hook name must be a string.

<a id="FST_ERR_HOOK_INVALID_HANDLER"></a>
### FST_ERR_HOOK_INVALID_HANDLER

The hook callback must be a function.

<a id="FST_ERR_LOG_INVALID_DESTINATION"></a>
### FST_ERR_LOG_INVALID_DESTINATION

Logger acceptes either a `'stream'` or a `'file'` as the destination.

<a id="FST_ERR_REP_INVALID_PAYLOAD_TYPE"></a>
### FST_ERR_REP_INVALID_PAYLOAD_TYPE

Reply payload can either be a `string` or a `Buffer`.

<a id="FST_ERR_SCH_MISSING_ID"></a>
### FST_ERR_SCH_MISSING_ID

The schema provided does not have `$id` property.

<a id="FST_ERR_SCH_ALREADY_PRESENT"></a>
### FST_ERR_SCH_ALREADY_PRESENT

A schema with the same `$id` already exists.

<a id="FST_ERR_SCH_NOT_PRESENT"></a>
### FST_ERR_SCH_NOT_PRESENT

No schema with the provided `$id` exists.