'use strict'

const createError = require('fastify-error')
const codes = {
  /**
   * Basic
   */
  FST_ERR_NOT_FOUND: createError(
    'FST_ERR_NOT_FOUND',
    'Not Found',
    404
  ),

  /**
   * ContentTypeParser
  */
  FST_ERR_CTP_ALREADY_PRESENT: createError(
    'FST_ERR_CTP_ALREADY_PRESENT',
    "Content type parser '%s' already present."
  ),
  FST_ERR_CTP_INVALID_TYPE: createError(
    'FST_ERR_CTP_INVALID_TYPE',
    'The content type should be a string',
    500,
    TypeError
  ),
  FST_ERR_CTP_EMPTY_TYPE: createError(
    'FST_ERR_CTP_EMPTY_TYPE',
    'The content type cannot be an empty string',
    500,
    TypeError
  ),
  FST_ERR_CTP_INVALID_HANDLER: createError(
    'FST_ERR_CTP_INVALID_HANDLER',
    'The content type handler should be a function',
    500,
    TypeError
  ),
  FST_ERR_CTP_INVALID_PARSE_TYPE: createError(
    'FST_ERR_CTP_INVALID_PARSE_TYPE',
    "The body parser can only parse your data as 'string' or 'buffer', you asked '%s' which is not supported.",
    500,
    TypeError
  ),
  FST_ERR_CTP_BODY_TOO_LARGE: createError(
    'FST_ERR_CTP_BODY_TOO_LARGE',
    'Request body is too large',
    413,
    RangeError
  ),
  FST_ERR_CTP_INVALID_MEDIA_TYPE: createError(
    'FST_ERR_CTP_INVALID_MEDIA_TYPE',
    'Unsupported Media Type: %s',
    415
  ),
  FST_ERR_CTP_INVALID_CONTENT_LENGTH: createError(
    'FST_ERR_CTP_INVALID_CONTENT_LENGTH',
    'Request body size did not match Content-Length',
    400,
    RangeError
  ),
  FST_ERR_CTP_EMPTY_JSON_BODY: createError(
    'FST_ERR_CTP_EMPTY_JSON_BODY',
    "Body cannot be empty when content-type is set to 'application/json'",
    400
  ),

  /**
   * decorate
  */
  FST_ERR_DEC_ALREADY_PRESENT: createError(
    'FST_ERR_DEC_ALREADY_PRESENT',
    "The decorator '%s' has already been added!"
  ),
  FST_ERR_DEC_MISSING_DEPENDENCY: createError(
    'FST_ERR_DEC_MISSING_DEPENDENCY',
    "The decorator is missing dependency '%s'."
  ),
  FST_ERR_DEC_AFTER_START: createError(
    'FST_ERR_DEC_AFTER_START',
    "The decorator '%s' has been added after start!"
  ),

  /**
   * hooks
  */
  FST_ERR_HOOK_INVALID_TYPE: createError(
    'FST_ERR_HOOK_INVALID_TYPE',
    'The hook name must be a string',
    500,
    TypeError
  ),
  FST_ERR_HOOK_INVALID_HANDLER: createError(
    'FST_ERR_HOOK_INVALID_HANDLER',
    'The hook callback must be a function',
    500,
    TypeError
  ),

  /**
   * Middlewares
   */
  FST_ERR_MISSING_MIDDLEWARE: createError(
    'FST_ERR_MISSING_MIDDLEWARE',
    'You must register a plugin for handling middlewares, visit fastify.io/docs/latest/Middleware/ for more info.',
    500
  ),

  /**
   * logger
  */
  FST_ERR_LOG_INVALID_DESTINATION: createError(
    'FST_ERR_LOG_INVALID_DESTINATION',
    'Cannot specify both logger.stream and logger.file options'
  ),

  /**
   * reply
  */
  FST_ERR_REP_INVALID_PAYLOAD_TYPE: createError(
    'FST_ERR_REP_INVALID_PAYLOAD_TYPE',
    "Attempted to send payload of invalid type '%s'. Expected a string or Buffer.",
    500,
    TypeError
  ),
  FST_ERR_REP_ALREADY_SENT: createError(
    'FST_ERR_REP_ALREADY_SENT',
    'Reply was already sent.'
  ),
  FST_ERR_REP_SENT_VALUE: createError(
    'FST_ERR_REP_SENT_VALUE',
    'The only possible value for reply.sent is true.'
  ),
  FST_ERR_SEND_INSIDE_ONERR: createError(
    'FST_ERR_SEND_INSIDE_ONERR',
    'You cannot use `send` inside the `onError` hook'
  ),
  FST_ERR_SEND_UNDEFINED_ERR: createError(
    'FST_ERR_SEND_UNDEFINED_ERR',
    'Undefined error has occured'
  ),
  FST_ERR_BAD_STATUS_CODE: createError(
    'FST_ERR_BAD_STATUS_CODE',
    'Called reply with an invalid status code: %s'
  ),

  /**
   * schemas
  */
  FST_ERR_SCH_MISSING_ID: createError(
    'FST_ERR_SCH_MISSING_ID',
    'Missing schema $id property'
  ),
  FST_ERR_SCH_ALREADY_PRESENT: createError(
    'FST_ERR_SCH_ALREADY_PRESENT',
    "Schema with id '%s' already declared!"
  ),
  FST_ERR_SCH_DUPLICATE: createError(
    'FST_ERR_SCH_DUPLICATE',
    "Schema with '%s' already present!"
  ),
  FST_ERR_SCH_VALIDATION_BUILD: createError(
    'FST_ERR_SCH_VALIDATION_BUILD',
    'Failed building the validation schema for %s: %s, due to error %s'
  ),
  FST_ERR_SCH_SERIALIZATION_BUILD: createError(
    'FST_ERR_SCH_SERIALIZATION_BUILD',
    'Failed building the serialization schema for %s: %s, due to error %s'
  ),

  /**
   * wrapThenable
   */
  FST_ERR_PROMISE_NOT_FULLFILLED: createError(
    'FST_ERR_PROMISE_NOT_FULLFILLED',
    "Promise may not be fulfilled with 'undefined' when statusCode is not 204"
  ),

  /**
   * http2
   */
  FST_ERR_HTTP2_INVALID_VERSION: createError(
    'FST_ERR_HTTP2_INVALID_VERSION',
    'HTTP2 is available only from node >= 8.8.1'
  ),

  /**
   * initialConfig
   */
  FST_ERR_INIT_OPTS_INVALID: createError(
    'FST_ERR_INIT_OPTS_INVALID',
    "Invalid initialization options: '%s'"
  ),

  /**
   * router
   */
  FST_ERR_BAD_URL: createError(
    'FST_ERR_BAD_URL',
    "'%s' is not a valid url component",
    400
  ),

  /**
   *  again listen when close server
   */
  FST_ERR_REOPENED_CLOSE_SERVER: createError(
    'FST_ERR_REOPENED_CLOSE_SERVER',
    'Fastify has already been closed and cannot be reopened'
  ),
  FST_ERR_REOPENED_SERVER: createError(
    'FST_ERR_REOPENED_SERVER',
    'Fastify is already listening'
  )
}

module.exports = codes
