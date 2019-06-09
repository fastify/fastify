'use strict'

const { inherits, format } = require('util')
const codes = {}

/**
 * Basic
 */

createError('FST_ERR_NOT_FOUND', `Not Found`, 404)

/**
 * ContentTypeParser
*/
createError('FST_ERR_CTP_ALREADY_PRESENT', `Content type parser '%s' already present.`)
createError('FST_ERR_CTP_INVALID_TYPE', 'The content type should be a string', 500, TypeError)
createError('FST_ERR_CTP_EMPTY_TYPE', 'The content type cannot be an empty string', 500, TypeError)
createError('FST_ERR_CTP_INVALID_HANDLER', 'The content type handler should be a function', 500, TypeError)
createError('FST_ERR_CTP_INVALID_PARSE_TYPE', `The body parser can only parse your data as 'string' or 'buffer', you asked '%s' which is not supported.`, 500, TypeError)
createError('FST_ERR_CTP_BODY_TOO_LARGE', 'Request body is too large', 413, RangeError)
createError('FST_ERR_CTP_INVALID_MEDIA_TYPE', `Unsupported Media Type: %s`, 415)
createError('FST_ERR_CTP_INVALID_CONTENT_LENGTH', 'Request body size did not match Content-Length', 400, RangeError)
createError('FST_ERR_CTP_EMPTY_JSON_BODY', `Body cannot be empty when content-type is set to 'application/json'`, 400)

/**
 * decorate
*/
createError('FST_ERR_DEC_ALREADY_PRESENT', `The decorator '%s' has already been added!`)
createError('FST_ERR_DEC_MISSING_DEPENDENCY', `The decorator is missing dependency '%s'.`)

/**
 * hooks
*/
createError('FST_ERR_HOOK_INVALID_TYPE', `The hook name must be a string`, 500, TypeError)
createError('FST_ERR_HOOK_INVALID_HANDLER', `The hook callback must be a function`, 500, TypeError)

/**
 * logger
*/
createError('FST_ERR_LOG_INVALID_DESTINATION', `Cannot specify both logger.stream and logger.file options`)

/**
 * reply
*/
createError('FST_ERR_REP_INVALID_PAYLOAD_TYPE', `Attempted to send payload of invalid type '%s'. Expected a string or Buffer.`, 500, TypeError)
createError('FST_ERR_REP_ALREADY_SENT', 'Reply was already sent.')
createError('FST_ERR_REP_SENT_VALUE', 'The only possible value for reply.sent is true.')
createError('FST_ERR_SEND_INSIDE_ONERR', 'You cannot use `send` inside the `onError` hook')

/**
 * schemas
*/
createError('FST_ERR_SCH_MISSING_ID', `Missing schema $id property`)
createError('FST_ERR_SCH_ALREADY_PRESENT', `Schema with id '%s' already declared!`)
createError('FST_ERR_SCH_NOT_PRESENT', `Schema with id '%s' does not exist!`)
createError('FST_ERR_SCH_DUPLICATE', `Schema with '%s' already present!`)

/**
 * wrapThenable
 */
createError('FST_ERR_PROMISE_NOT_FULLFILLED', `Promise may not be fulfilled with 'undefined' when statusCode is not 204`)

/**
 * http2
 */
createError('FST_ERR_HTTP2_INVALID_VERSION', `HTTP2 is available only from node >= 8.8.1`)

/**
 * initialConfig
 */
createError('FST_ERR_INIT_OPTS_INVALID', `Invalid initialization options: '%s'`)

function createError (code, message, statusCode = 500, Base = Error) {
  if (!code) throw new Error('Fastify error code must not be empty')
  if (!message) throw new Error('Fastify error message must not be empty')

  code = code.toUpperCase()

  function FastifyError (a, b, c) {
    Error.captureStackTrace(this, FastifyError)
    this.name = `FastifyError [${code}]`
    this.code = code

    // more performant than spread (...) operator
    if (a && b && c) {
      this.message = format(message, a, b, c)
    } else if (a && b) {
      this.message = format(message, a, b)
    } else if (a) {
      this.message = format(message, a)
    } else {
      this.message = message
    }

    this.message = `${this.code}: ${this.message}`
    this.statusCode = statusCode || undefined
  }

  inherits(FastifyError, Base)

  codes[code] = FastifyError

  return codes[code]
}

module.exports = { codes, createError }
