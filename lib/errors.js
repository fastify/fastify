'use strict'

const createError = require('@fastify/error')

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
    'The content type should be a string or a RegExp',
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
  FST_ERR_DEC_DEPENDENCY_INVALID_TYPE: createError(
    'FST_ERR_DEC_DEPENDENCY_INVALID_TYPE',
    "The dependencies of decorator '%s' must be of type Array."
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
    '%s hook should be a function, instead got %s',
    500,
    TypeError
  ),

  /**
   * Middlewares
   */
  FST_ERR_MISSING_MIDDLEWARE: createError(
    'FST_ERR_MISSING_MIDDLEWARE',
    'You must register a plugin for handling middlewares, visit fastify.io/docs/latest/Reference/Middleware/ for more info.',
    500
  ),

  FST_ERR_HOOK_TIMEOUT: createError(
    'FST_ERR_HOOK_TIMEOUT',
    "A callback for '%s' hook timed out. You may have forgotten to call 'done' function or to resolve a Promise"
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
    'Undefined error has occurred'
  ),
  FST_ERR_BAD_STATUS_CODE: createError(
    'FST_ERR_BAD_STATUS_CODE',
    'Called reply with an invalid status code: %s'
  ),
  FST_ERR_BAD_TRAILER_NAME: createError(
    'FST_ERR_BAD_TRAILER_NAME',
    'Called reply.trailer with an invalid header name: %s'
  ),
  FST_ERR_BAD_TRAILER_VALUE: createError(
    'FST_ERR_BAD_TRAILER_VALUE',
    "Called reply.trailer('%s', fn) with an invalid type: %s. Expected a function."
  ),
  FST_ERR_MISSING_SERIALIZATION_FN: createError(
    'FST_ERR_MISSING_SERIALIZATION_FN',
    'Missing serialization function. Key "%s"'
  ),
  FST_ERR_MISSING_CONTENTTYPE_SERIALIZATION_FN: createError(
    'FST_ERR_MISSING_CONTENTTYPE_SERIALIZATION_FN',
    'Missing serialization function. Key "%s:%s"'
  ),
  FST_ERR_REQ_INVALID_VALIDATION_INVOCATION: createError(
    'FST_ERR_REQ_INVALID_VALIDATION_INVOCATION',
    'Invalid validation invocation. Missing validation function for HTTP part "%s" nor schema provided.'
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
  FST_ERR_SCH_CONTENT_MISSING_SCHEMA: createError(
    'FST_ERR_SCH_CONTENT_MISSING_SCHEMA',
    "Schema is missing for the content type '%s'"
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
  FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE: createError(
    'FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE',
    "Cannot set forceCloseConnections to 'idle' as your HTTP server does not support closeIdleConnections method"
  ),

  /**
   * router
   */
  FST_ERR_DUPLICATED_ROUTE: createError(
    'FST_ERR_DUPLICATED_ROUTE',
    "Method '%s' already declared for route '%s'"
  ),
  FST_ERR_BAD_URL: createError(
    'FST_ERR_BAD_URL',
    "'%s' is not a valid url component",
    400
  ),
  FST_ERR_ASYNC_CONSTRAINT: createError(
    'FST_ERR_ASYNC_CONSTRAINT',
    'Unexpected error from async constraint',
    500
  ),
  FST_ERR_DEFAULT_ROUTE_INVALID_TYPE: createError(
    'FST_ERR_DEFAULT_ROUTE_INVALID_TYPE',
    'The defaultRoute type should be a function',
    500,
    TypeError
  ),
  FST_ERR_INVALID_URL: createError(
    'FST_ERR_INVALID_URL',
    "URL must be a string. Received '%s'",
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
  ),

  /**
   * plugin
   */
  FST_ERR_PLUGIN_VERSION_MISMATCH: createError(
    'FST_ERR_PLUGIN_VERSION_MISMATCH',
    "fastify-plugin: %s - expected '%s' fastify version, '%s' is installed"
  ),

  /**
   *  Avvio Errors
   */
  FST_ERR_PLUGIN_CALLBACK_NOT_FN: createError(
    'FST_ERR_PLUGIN_CALLBACK_NOT_FN',
    'fastify-plugin: %s'
  ),
  FST_ERR_PLUGIN_NOT_VALID: createError(
    'FST_ERR_PLUGIN_NOT_VALID',
    'fastify-plugin: %s'
  ),
  FST_ERR_ROOT_PLG_BOOTED: createError(
    'FST_ERR_ROOT_PLG_BOOTED',
    'fastify-plugin: %s'
  ),
  FST_ERR_PARENT_PLUGIN_BOOTED: createError(
    'FST_ERR_PARENT_PLUGIN_BOOTED',
    'fastify-plugin: %s'
  ),
  FST_ERR_PLUGIN_TIMEOUT: createError(
    'FST_ERR_PLUGIN_TIMEOUT',
    'fastify-plugin: %s'
  )
}

function appendStackTrace (oldErr, newErr) {
  newErr.cause = oldErr

  return newErr
}

module.exports = codes
module.exports.appendStackTrace = appendStackTrace
module.exports.AVVIO_ERRORS_MAP = {
  AVV_ERR_CALLBACK_NOT_FN: codes.FST_ERR_PLUGIN_CALLBACK_NOT_FN,
  AVV_ERR_PLUGIN_NOT_VALID: codes.FST_ERR_PLUGIN_NOT_VALID,
  AVV_ERR_ROOT_PLG_BOOTED: codes.FST_ERR_ROOT_PLG_BOOTED,
  AVV_ERR_PARENT_PLG_LOADED: codes.FST_ERR_PARENT_PLUGIN_BOOTED,
  AVV_ERR_READY_TIMEOUT: codes.FST_ERR_PLUGIN_TIMEOUT
}
