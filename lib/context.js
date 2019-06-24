'use strict'

const { kFourOhFourContext, kReplySerializerDefault } = require('./symbols.js')

// Objects that holds the context of every request
// Every route holds an instance of this object.
function Context (schema, handler, Reply, Request, contentTypeParser, config, errorHandler, bodyLimit, logLevel, attachValidation, replySerializer) {
  this.schema = schema
  this.handler = handler
  this.Reply = Reply
  this.Request = Request
  this.contentTypeParser = contentTypeParser
  this.onRequest = null
  this.onSend = null
  this.onError = null
  this.preHandler = null
  this.onResponse = null
  this.config = config
  this.errorHandler = errorHandler || defaultErrorHandler
  this._middie = null
  this._parserOptions = { limit: bodyLimit || null }
  this.logLevel = logLevel
  this[kFourOhFourContext] = null
  this.attachValidation = attachValidation
  this[kReplySerializerDefault] = replySerializer
}

function defaultErrorHandler (error, request, reply) {
  var res = reply.res
  if (res.statusCode >= 500) {
    reply.log.error({ req: reply.request.raw, res: res, err: error }, error && error.message)
  } else if (res.statusCode >= 400) {
    reply.log.info({ res: res, err: error }, error && error.message)
  }
  reply.send(error)
}

module.exports = Context
