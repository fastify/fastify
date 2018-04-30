'use strict'

const util = require('util')
const codes = {}

/**
 * ContentTypeParser
*/
createError('FST_ERR_CTP_ALREADY_PRESENT')
createError('FST_ERR_CTP_INVALID_TYPE', TypeError)
createError('FST_ERR_CTP_EMPTY_TYPE')
createError('FST_ERR_CTP_INVALID_HANDLER')
createError('FST_ERR_CTP_INVALID_PARSE_AS')
createError('FST_ERR_CTP_BODY_TOO_LARGE')
createError('FST_ERR_CTP_INVALID_MEDIA_TYPE')
createError('FST_ERR_CTP_INVALID_CONTENT_LENGTH')

function createMessage (args = []) {
  // only simple string or template literal
  if (args.length === 1) return args[0]
  return util.format.apply(null, args)
}

function createError (code, Base = Error) {
  code = code.toUpperCase()
  const errClass = class FastifyError extends Base {
    constructor (...args) {
      super(`Code: ${code}; ${createMessage(args)}`)
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
