'use strict'

const { test } = require('tap')
const errors = require('../../lib/errors')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')

test('should expose 78 errors', t => {
  t.plan(1)
  const exportedKeys = Object.keys(errors)
  let counter = 0
  for (const key of exportedKeys) {
    if (errors[key].name === 'FastifyError') {
      counter++
    }
  }
  t.equal(counter, 78)
})

test('ensure name and codes of Errors are identical', t => {
  t.plan(78)
  const exportedKeys = Object.keys(errors)
  for (const key of exportedKeys) {
    if (errors[key].name === 'FastifyError') {
      t.equal(key, new errors[key]().code, key)
    }
  }
})

test('FST_ERR_NOT_FOUND', t => {
  t.plan(5)
  const error = new errors.FST_ERR_NOT_FOUND()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_NOT_FOUND')
  t.equal(error.message, 'Not Found')
  t.equal(error.statusCode, 404)
  t.ok(error instanceof Error)
})

test('FST_ERR_OPTIONS_NOT_OBJ', t => {
  t.plan(5)
  const error = new errors.FST_ERR_OPTIONS_NOT_OBJ()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_OPTIONS_NOT_OBJ')
  t.equal(error.message, 'Options must be an object')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_QSP_NOT_FN', t => {
  t.plan(5)
  const error = new errors.FST_ERR_QSP_NOT_FN()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_QSP_NOT_FN')
  t.equal(error.message, "querystringParser option should be a function, instead got '%s'")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_SCHEMA_CONTROLLER_BUCKET_OPT_NOT_FN', t => {
  t.plan(5)
  const error = new errors.FST_ERR_SCHEMA_CONTROLLER_BUCKET_OPT_NOT_FN()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_SCHEMA_CONTROLLER_BUCKET_OPT_NOT_FN')
  t.equal(error.message, "schemaController.bucket option should be a function, instead got '%s'")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_SCHEMA_ERROR_FORMATTER_NOT_FN', t => {
  t.plan(5)
  const error = new errors.FST_ERR_SCHEMA_ERROR_FORMATTER_NOT_FN()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_SCHEMA_ERROR_FORMATTER_NOT_FN')
  t.equal(error.message, "schemaErrorFormatter option should be a non async function. Instead got '%s'.")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_AJV_CUSTOM_OPTIONS_OPT_NOT_OBJ', t => {
  t.plan(5)
  const error = new errors.FST_ERR_AJV_CUSTOM_OPTIONS_OPT_NOT_OBJ()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_AJV_CUSTOM_OPTIONS_OPT_NOT_OBJ')
  t.equal(error.message, "ajv.customOptions option should be an object, instead got '%s'")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_AJV_CUSTOM_OPTIONS_OPT_NOT_ARR', t => {
  t.plan(5)
  const error = new errors.FST_ERR_AJV_CUSTOM_OPTIONS_OPT_NOT_ARR()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_AJV_CUSTOM_OPTIONS_OPT_NOT_ARR')
  t.equal(error.message, "ajv.plugins option should be an array, instead got '%s'")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_VERSION_CONSTRAINT_NOT_STR', t => {
  t.plan(5)
  const error = new errors.FST_ERR_VERSION_CONSTRAINT_NOT_STR()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_VERSION_CONSTRAINT_NOT_STR')
  t.equal(error.message, 'Version constraint should be a string.')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_CTP_ALREADY_PRESENT', t => {
  t.plan(5)
  const error = new errors.FST_ERR_CTP_ALREADY_PRESENT()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_CTP_ALREADY_PRESENT')
  t.equal(error.message, "Content type parser '%s' already present.")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_CTP_INVALID_TYPE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_CTP_INVALID_TYPE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_CTP_INVALID_TYPE')
  t.equal(error.message, 'The content type should be a string or a RegExp')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_CTP_EMPTY_TYPE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_CTP_EMPTY_TYPE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_CTP_EMPTY_TYPE')
  t.equal(error.message, 'The content type cannot be an empty string')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_CTP_INVALID_HANDLER', t => {
  t.plan(5)
  const error = new errors.FST_ERR_CTP_INVALID_HANDLER()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_CTP_INVALID_HANDLER')
  t.equal(error.message, 'The content type handler should be a function')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_CTP_INVALID_PARSE_TYPE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_CTP_INVALID_PARSE_TYPE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_CTP_INVALID_PARSE_TYPE')
  t.equal(error.message, "The body parser can only parse your data as 'string' or 'buffer', you asked '%s' which is not supported.")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_CTP_BODY_TOO_LARGE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_CTP_BODY_TOO_LARGE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_CTP_BODY_TOO_LARGE')
  t.equal(error.message, 'Request body is too large')
  t.equal(error.statusCode, 413)
  t.ok(error instanceof RangeError)
})

test('FST_ERR_CTP_INVALID_MEDIA_TYPE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_CTP_INVALID_MEDIA_TYPE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')
  t.equal(error.message, 'Unsupported Media Type: %s')
  t.equal(error.statusCode, 415)
  t.ok(error instanceof Error)
})

test('FST_ERR_CTP_INVALID_CONTENT_LENGTH', t => {
  t.plan(5)
  const error = new errors.FST_ERR_CTP_INVALID_CONTENT_LENGTH()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_CTP_INVALID_CONTENT_LENGTH')
  t.equal(error.message, 'Request body size did not match Content-Length')
  t.equal(error.statusCode, 400)
  t.ok(error instanceof RangeError)
})

test('FST_ERR_CTP_EMPTY_JSON_BODY', t => {
  t.plan(5)
  const error = new errors.FST_ERR_CTP_EMPTY_JSON_BODY()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_CTP_EMPTY_JSON_BODY')
  t.equal(error.message, "Body cannot be empty when content-type is set to 'application/json'")
  t.equal(error.statusCode, 400)
  t.ok(error instanceof Error)
})

test('FST_ERR_CTP_INSTANCE_ALREADY_STARTED', t => {
  t.plan(5)
  const error = new errors.FST_ERR_CTP_INSTANCE_ALREADY_STARTED()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_CTP_INSTANCE_ALREADY_STARTED')
  t.equal(error.message, 'Cannot call "%s" when fastify instance is already started!')
  t.equal(error.statusCode, 400)
  t.ok(error instanceof Error)
})

test('FST_ERR_DEC_ALREADY_PRESENT', t => {
  t.plan(5)
  const error = new errors.FST_ERR_DEC_ALREADY_PRESENT()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_DEC_ALREADY_PRESENT')
  t.equal(error.message, "The decorator '%s' has already been added!")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_DEC_DEPENDENCY_INVALID_TYPE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_DEC_DEPENDENCY_INVALID_TYPE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_DEC_DEPENDENCY_INVALID_TYPE')
  t.equal(error.message, "The dependencies of decorator '%s' must be of type Array.")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_DEC_MISSING_DEPENDENCY', t => {
  t.plan(5)
  const error = new errors.FST_ERR_DEC_MISSING_DEPENDENCY()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_DEC_MISSING_DEPENDENCY')
  t.equal(error.message, "The decorator is missing dependency '%s'.")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_DEC_AFTER_START', t => {
  t.plan(5)
  const error = new errors.FST_ERR_DEC_AFTER_START()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_DEC_AFTER_START')
  t.equal(error.message, "The decorator '%s' has been added after start!")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_HOOK_INVALID_TYPE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_HOOK_INVALID_TYPE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_HOOK_INVALID_TYPE')
  t.equal(error.message, 'The hook name must be a string')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_HOOK_INVALID_HANDLER', t => {
  t.plan(5)
  const error = new errors.FST_ERR_HOOK_INVALID_HANDLER()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_HOOK_INVALID_HANDLER')
  t.equal(error.message, '%s hook should be a function, instead got %s')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_HOOK_INVALID_ASYNC_HANDLER', t => {
  t.plan(5)
  const error = new errors.FST_ERR_HOOK_INVALID_ASYNC_HANDLER()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_HOOK_INVALID_ASYNC_HANDLER')
  t.equal(error.message, "Async function has too many arguments. Async hooks should not use the 'done' argument.")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_HOOK_NOT_SUPPORTED', t => {
  t.plan(5)
  const error = new errors.FST_ERR_HOOK_NOT_SUPPORTED()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_HOOK_NOT_SUPPORTED')
  t.equal(error.message, '%s hook not supported!')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_MISSING_MIDDLEWARE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_MISSING_MIDDLEWARE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_MISSING_MIDDLEWARE')
  t.equal(error.message, 'You must register a plugin for handling middlewares, visit fastify.io/docs/latest/Reference/Middleware/ for more info.')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_HOOK_TIMEOUT', t => {
  t.plan(5)
  const error = new errors.FST_ERR_HOOK_TIMEOUT()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_HOOK_TIMEOUT')
  t.equal(error.message, "A callback for '%s' hook timed out. You may have forgotten to call 'done' function or to resolve a Promise")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_LOG_INVALID_DESTINATION', t => {
  t.plan(5)
  const error = new errors.FST_ERR_LOG_INVALID_DESTINATION()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_LOG_INVALID_DESTINATION')
  t.equal(error.message, 'Cannot specify both logger.stream and logger.file options')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_LOG_INVALID_LOGGER', t => {
  t.plan(5)
  const error = new errors.FST_ERR_LOG_INVALID_LOGGER()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_LOG_INVALID_LOGGER')
  t.equal(error.message, "Invalid logger object provided. The logger instance should have these functions(s): '%s'.")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_REP_INVALID_PAYLOAD_TYPE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_REP_INVALID_PAYLOAD_TYPE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_REP_INVALID_PAYLOAD_TYPE')
  t.equal(error.message, "Attempted to send payload of invalid type '%s'. Expected a string or Buffer.")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_REP_ALREADY_SENT', t => {
  t.plan(5)
  const error = new errors.FST_ERR_REP_ALREADY_SENT('/hello', 'GET')
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_REP_ALREADY_SENT')
  t.equal(error.message, 'Reply was already sent, did you forget to "return reply" in "/hello" (GET)?')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_REP_SENT_VALUE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_REP_SENT_VALUE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_REP_SENT_VALUE')
  t.equal(error.message, 'The only possible value for reply.sent is true.')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_SEND_INSIDE_ONERR', t => {
  t.plan(5)
  const error = new errors.FST_ERR_SEND_INSIDE_ONERR()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_SEND_INSIDE_ONERR')
  t.equal(error.message, 'You cannot use `send` inside the `onError` hook')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_SEND_UNDEFINED_ERR', t => {
  t.plan(5)
  const error = new errors.FST_ERR_SEND_UNDEFINED_ERR()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_SEND_UNDEFINED_ERR')
  t.equal(error.message, 'Undefined error has occurred')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_BAD_STATUS_CODE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_BAD_STATUS_CODE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_BAD_STATUS_CODE')
  t.equal(error.message, 'Called reply with an invalid status code: %s')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_BAD_TRAILER_NAME', t => {
  t.plan(5)
  const error = new errors.FST_ERR_BAD_TRAILER_NAME()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_BAD_TRAILER_NAME')
  t.equal(error.message, 'Called reply.trailer with an invalid header name: %s')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_BAD_TRAILER_VALUE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_BAD_TRAILER_VALUE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_BAD_TRAILER_VALUE')
  t.equal(error.message, "Called reply.trailer('%s', fn) with an invalid type: %s. Expected a function.")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_FAILED_ERROR_SERIALIZATION', t => {
  t.plan(5)
  const error = new errors.FST_ERR_FAILED_ERROR_SERIALIZATION()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_FAILED_ERROR_SERIALIZATION')
  t.equal(error.message, 'Failed to serialize an error. Error: %s. Original error: %s')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_MISSING_SERIALIZATION_FN', t => {
  t.plan(5)
  const error = new errors.FST_ERR_MISSING_SERIALIZATION_FN()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_MISSING_SERIALIZATION_FN')
  t.equal(error.message, 'Missing serialization function. Key "%s"')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_MISSING_CONTENTTYPE_SERIALIZATION_FN', t => {
  t.plan(5)
  const error = new errors.FST_ERR_MISSING_CONTENTTYPE_SERIALIZATION_FN()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_MISSING_CONTENTTYPE_SERIALIZATION_FN')
  t.equal(error.message, 'Missing serialization function. Key "%s:%s"')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_REQ_INVALID_VALIDATION_INVOCATION', t => {
  t.plan(5)
  const error = new errors.FST_ERR_REQ_INVALID_VALIDATION_INVOCATION()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_REQ_INVALID_VALIDATION_INVOCATION')
  t.equal(error.message, 'Invalid validation invocation. Missing validation function for HTTP part "%s" nor schema provided.')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_SCH_MISSING_ID', t => {
  t.plan(5)
  const error = new errors.FST_ERR_SCH_MISSING_ID()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_SCH_MISSING_ID')
  t.equal(error.message, 'Missing schema $id property')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_SCH_ALREADY_PRESENT', t => {
  t.plan(5)
  const error = new errors.FST_ERR_SCH_ALREADY_PRESENT()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_SCH_ALREADY_PRESENT')
  t.equal(error.message, "Schema with id '%s' already declared!")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_SCH_CONTENT_MISSING_SCHEMA', t => {
  t.plan(5)
  const error = new errors.FST_ERR_SCH_CONTENT_MISSING_SCHEMA()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_SCH_CONTENT_MISSING_SCHEMA')
  t.equal(error.message, "Schema is missing for the content type '%s'")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_SCH_DUPLICATE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_SCH_DUPLICATE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_SCH_DUPLICATE')
  t.equal(error.message, "Schema with '%s' already present!")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_SCH_VALIDATION_BUILD', t => {
  t.plan(5)
  const error = new errors.FST_ERR_SCH_VALIDATION_BUILD()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_SCH_VALIDATION_BUILD')
  t.equal(error.message, 'Failed building the validation schema for %s: %s, due to error %s')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_SCH_SERIALIZATION_BUILD', t => {
  t.plan(5)
  const error = new errors.FST_ERR_SCH_SERIALIZATION_BUILD()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_SCH_SERIALIZATION_BUILD')
  t.equal(error.message, 'Failed building the serialization schema for %s: %s, due to error %s')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_SCH_RESPONSE_SCHEMA_NOT_NESTED_2XX', t => {
  t.plan(5)
  const error = new errors.FST_ERR_SCH_RESPONSE_SCHEMA_NOT_NESTED_2XX()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_SCH_RESPONSE_SCHEMA_NOT_NESTED_2XX')
  t.equal(error.message, 'response schemas should be nested under a valid status code, e.g { 2xx: { type: "object" } }')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_HTTP2_INVALID_VERSION', t => {
  t.plan(5)
  const error = new errors.FST_ERR_HTTP2_INVALID_VERSION()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_HTTP2_INVALID_VERSION')
  t.equal(error.message, 'HTTP2 is available only from node >= 8.8.1')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_INIT_OPTS_INVALID', t => {
  t.plan(5)
  const error = new errors.FST_ERR_INIT_OPTS_INVALID()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_INIT_OPTS_INVALID')
  t.equal(error.message, "Invalid initialization options: '%s'")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE')
  t.equal(error.message, "Cannot set forceCloseConnections to 'idle' as your HTTP server does not support closeIdleConnections method")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_DUPLICATED_ROUTE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_DUPLICATED_ROUTE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_DUPLICATED_ROUTE')
  t.equal(error.message, "Method '%s' already declared for route '%s'")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_BAD_URL', t => {
  t.plan(5)
  const error = new errors.FST_ERR_BAD_URL()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_BAD_URL')
  t.equal(error.message, "'%s' is not a valid url component")
  t.equal(error.statusCode, 400)
  t.ok(error instanceof Error)
})

test('FST_ERR_ASYNC_CONSTRAINT', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ASYNC_CONSTRAINT()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_ASYNC_CONSTRAINT')
  t.equal(error.message, 'Unexpected error from async constraint')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_DEFAULT_ROUTE_INVALID_TYPE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_DEFAULT_ROUTE_INVALID_TYPE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_DEFAULT_ROUTE_INVALID_TYPE')
  t.equal(error.message, 'The defaultRoute type should be a function')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_INVALID_URL', t => {
  t.plan(5)
  const error = new errors.FST_ERR_INVALID_URL()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_INVALID_URL')
  t.equal(error.message, "URL must be a string. Received '%s'")
  t.equal(error.statusCode, 400)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_ROUTE_OPTIONS_NOT_OBJ', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ROUTE_OPTIONS_NOT_OBJ()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_ROUTE_OPTIONS_NOT_OBJ')
  t.equal(error.message, 'Options for "%s:%s" route must be an object')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_ROUTE_DUPLICATED_HANDLER', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ROUTE_DUPLICATED_HANDLER()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_ROUTE_DUPLICATED_HANDLER')
  t.equal(error.message, 'Duplicate handler for "%s:%s" route is not allowed!')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_ROUTE_HANDLER_NOT_FN', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ROUTE_HANDLER_NOT_FN()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_ROUTE_HANDLER_NOT_FN')
  t.equal(error.message, 'Error Handler for %s:%s route, if defined, must be a function')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_ROUTE_MISSING_HANDLER', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ROUTE_MISSING_HANDLER()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_ROUTE_MISSING_HANDLER')
  t.equal(error.message, 'Missing handler function for "%s:%s" route.')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_ROUTE_METHOD_INVALID', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ROUTE_METHOD_INVALID()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_ROUTE_METHOD_INVALID')
  t.equal(error.message, 'Provided method is invalid!')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_ROUTE_METHOD_NOT_SUPPORTED', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ROUTE_METHOD_NOT_SUPPORTED()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_ROUTE_METHOD_NOT_SUPPORTED')
  t.equal(error.message, '%s method is not supported.')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_ROUTE_BODY_VALIDATION_SCHEMA_NOT_SUPPORTED', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ROUTE_BODY_VALIDATION_SCHEMA_NOT_SUPPORTED()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_ROUTE_BODY_VALIDATION_SCHEMA_NOT_SUPPORTED')
  t.equal(error.message, 'Body validation schema for %s:%s route is not supported!')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_ROUTE_BODY_LIMIT_OPTION_NOT_INT', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ROUTE_BODY_LIMIT_OPTION_NOT_INT()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_ROUTE_BODY_LIMIT_OPTION_NOT_INT')
  t.equal(error.message, "'bodyLimit' option must be an integer > 0. Got '%s'")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_ROUTE_BODY_LIMIT_OPTION_NOT_INT', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ROUTE_BODY_LIMIT_OPTION_NOT_INT()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_ROUTE_BODY_LIMIT_OPTION_NOT_INT')
  t.equal(error.message, "'bodyLimit' option must be an integer > 0. Got '%s'")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_ROUTE_REWRITE_NOT_STR', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ROUTE_REWRITE_NOT_STR()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_ROUTE_REWRITE_NOT_STR')
  t.equal(error.message, 'Rewrite url for "%s" needs to be of type "string" but received "%s"')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_REOPENED_CLOSE_SERVER', t => {
  t.plan(5)
  const error = new errors.FST_ERR_REOPENED_CLOSE_SERVER()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_REOPENED_CLOSE_SERVER')
  t.equal(error.message, 'Fastify has already been closed and cannot be reopened')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_REOPENED_SERVER', t => {
  t.plan(5)
  const error = new errors.FST_ERR_REOPENED_SERVER()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_REOPENED_SERVER')
  t.equal(error.message, 'Fastify is already listening')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_INSTANCE_ALREADY_LISTENING', t => {
  t.plan(5)
  const error = new errors.FST_ERR_INSTANCE_ALREADY_LISTENING()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_INSTANCE_ALREADY_LISTENING')
  t.equal(error.message, 'Fastify instance is already listening. %s')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_PLUGIN_VERSION_MISMATCH', t => {
  t.plan(5)
  const error = new errors.FST_ERR_PLUGIN_VERSION_MISMATCH()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_PLUGIN_VERSION_MISMATCH')
  t.equal(error.message, "fastify-plugin: %s - expected '%s' fastify version, '%s' is installed")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_PLUGIN_NOT_PRESENT_IN_INSTANCE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_PLUGIN_NOT_PRESENT_IN_INSTANCE()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_PLUGIN_NOT_PRESENT_IN_INSTANCE')
  t.equal(error.message, "The decorator '%s'%s is not present in %s")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_PLUGIN_CALLBACK_NOT_FN', t => {
  t.plan(5)
  const error = new errors.FST_ERR_PLUGIN_CALLBACK_NOT_FN()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_PLUGIN_CALLBACK_NOT_FN')
  t.equal(error.message, 'fastify-plugin: %s')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('FST_ERR_PLUGIN_NOT_VALID', t => {
  t.plan(5)
  const error = new errors.FST_ERR_PLUGIN_NOT_VALID()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_PLUGIN_NOT_VALID')
  t.equal(error.message, 'fastify-plugin: %s')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_ROOT_PLG_BOOTED', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ROOT_PLG_BOOTED()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_ROOT_PLG_BOOTED')
  t.equal(error.message, 'fastify-plugin: %s')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_PARENT_PLUGIN_BOOTED', t => {
  t.plan(5)
  const error = new errors.FST_ERR_PARENT_PLUGIN_BOOTED()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_PARENT_PLUGIN_BOOTED')
  t.equal(error.message, 'fastify-plugin: %s')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_PLUGIN_TIMEOUT', t => {
  t.plan(5)
  const error = new errors.FST_ERR_PLUGIN_TIMEOUT()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_PLUGIN_TIMEOUT')
  t.equal(error.message, 'fastify-plugin: %s')
  t.equal(error.statusCode, 500)
  t.ok(error instanceof Error)
})

test('FST_ERR_VALIDATION', t => {
  t.plan(5)
  const error = new errors.FST_ERR_VALIDATION()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_VALIDATION')
  t.equal(error.message, '%s')
  t.equal(error.statusCode, 400)
  t.ok(error instanceof Error)
})

test('FST_ERR_LISTEN_OPTIONS_INVALID', t => {
  t.plan(5)
  const error = new errors.FST_ERR_LISTEN_OPTIONS_INVALID()
  t.equal(error.name, 'FastifyError')
  t.equal(error.code, 'FST_ERR_LISTEN_OPTIONS_INVALID')
  t.equal(error.message, "Invalid listen options: '%s'")
  t.equal(error.statusCode, 500)
  t.ok(error instanceof TypeError)
})

test('Ensure that all errors are in Errors.md documented', t => {
  t.plan(78)
  const errorsMd = readFileSync(resolve(__dirname, '../../docs/Reference/Errors.md'), 'utf8')

  const exportedKeys = Object.keys(errors)
  for (const key of exportedKeys) {
    if (errors[key].name === 'FastifyError') {
      t.ok(errorsMd.includes(`#### ${key}\n`), key)
    }
  }
})

test('Ensure that non-existing errors are not in Errors.md documented', t => {
  t.plan(78)
  const errorsMd = readFileSync(resolve(__dirname, '../../docs/Reference/Errors.md'), 'utf8')

  const matchRE = /#### ([0-9a-zA-Z_]+)\n/g
  const matches = errorsMd.matchAll(matchRE)
  const exportedKeys = Object.keys(errors)

  for (const match of matches) {
    t.ok(exportedKeys.indexOf(match[1]) !== -1, match[1])
  }
})
