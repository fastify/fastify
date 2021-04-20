'use strict'

const { kFourOhFourContext, kReplySerializerDefault } = require('./symbols.js')

// Objects that holds the context of every request
// Every route holds an instance of this object.
function Context (schema, handler, Reply, Request, contentTypeParser, config, errorHandler, bodyLimit, logLevel, logSerializers, attachValidation, replySerializer, schemaErrorFormatter) {
  this.schema = schema
  this.handler = handler
  this.Reply = Reply
  this.Request = Request
  this.contentTypeParser = contentTypeParser
  this.onRequest = null
  this.onSend = null
  this.onError = null
  this.onTimeout = null
  this.preHandler = null
  this.onResponse = null
  this.config = config
  this.errorHandler = errorHandler
  this._middie = null
  this._parserOptions = { limit: bodyLimit || null }
  this.logLevel = logLevel
  this.logSerializers = logSerializers
  this[kFourOhFourContext] = null
  this.attachValidation = attachValidation
  this[kReplySerializerDefault] = replySerializer
  this.schemaErrorFormatter = schemaErrorFormatter || defaultSchemaErrorFormatter
}

function defaultSchemaErrorFormatter (errors, dataVar) {
  let text = ''
  const separator = ', '

  // eslint-disable-next-line no-var
  for (var i = 0; i !== errors.length; ++i) {
    const e = errors[i]
    text += dataVar + (e.dataPath || '') + ' ' + e.message + separator
  }
  return new Error(text.slice(0, -separator.length))
}

module.exports = Context
