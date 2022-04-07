'use strict'

const {
  kFourOhFourContext,
  kReplySerializerDefault,
  kSchemaErrorFormatter,
  kErrorHandler,
  kReply,
  kRequest,
  kBodyLimit,
  kLogLevel,
  kContentTypeParser
} = require('./symbols.js')

// Objects that holds the context of every request
// Every route holds an instance of this object.
function Context ({
  schema,
  handler,
  config,
  errorHandler,
  bodyLimit,
  logLevel,
  logSerializers,
  attachValidation,
  replySerializer,
  schemaErrorFormatter,
  server
}) {
  this.schema = schema
  this.handler = handler
  this.Reply = server[kReply]
  this.Request = server[kRequest]
  this.contentTypeParser = server[kContentTypeParser]
  this.onRequest = null
  this.onSend = null
  this.onError = null
  this.onTimeout = null
  this.preHandler = null
  this.onResponse = null
  this.config = config
  this.errorHandler = errorHandler || server[kErrorHandler]
  this._middie = null
  this._parserOptions = {
    limit: bodyLimit || server[kBodyLimit]
  }
  this.logLevel = logLevel || server[kLogLevel]
  this.logSerializers = logSerializers
  this[kFourOhFourContext] = null
  this.attachValidation = attachValidation
  this[kReplySerializerDefault] = replySerializer
  this.schemaErrorFormatter = schemaErrorFormatter || server[kSchemaErrorFormatter] || defaultSchemaErrorFormatter

  this.server = server
}

function defaultSchemaErrorFormatter (errors, dataVar) {
  let text = ''
  const separator = ', '

  // eslint-disable-next-line no-var
  for (var i = 0; i !== errors.length; ++i) {
    const e = errors[i]
    text += dataVar + (e.instancePath || '') + ' ' + e.message + separator
  }
  return new Error(text.slice(0, -separator.length))
}

module.exports = Context
