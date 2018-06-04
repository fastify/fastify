'use strict'

const { inherits, format } = require('util')
const codes = {}

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

function createError (code, message, statusCode = 500, Base = Error) {
  if (!code) throw new Error('Fastify error code must not be empty')
  if (!message) throw new Error('Fastify error message must not be empty')

  code = code.toUpperCase()

  function FastifyError (...args) {
    Error.captureStackTrace(this, FastifyError)
    this.name = `FastifyError [${code}]`
    this.code = code
    this.message = `Code: ${code}; ${format(message, ...args)}`
    if (statusCode) {
      this.statusCode = statusCode
    }
  }

  inherits(FastifyError, Base)

  codes[code] = FastifyError

  return codes[code]
}

module.exports = { codes, createError }
