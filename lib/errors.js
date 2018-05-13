'use strict'

const util = require('util')
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

function createMessage (msg, args = []) {
  args.unshift(msg)
  if (args.length === 1) return args[0]
  return util.format.apply(null, args)
}

function createError (code, msg, statusCode = 500, Base = Error) {
  code = code.toUpperCase()
  const errClass = class FastifyError extends Base {
    constructor (...args) {
      super(`Code: ${code}; ${createMessage(msg, args)}`)
    }
    get statusCode () {
      return statusCode
    }
    get name () {
      return `FastifyError [${code}]`
    }
    get code () {
      return code
    }
  }
  codes[code] = errClass
  return errClass
}

module.exports = { codes, createError }
