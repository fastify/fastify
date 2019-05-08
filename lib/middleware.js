'use strict'

const handleRequest = require('./handleRequest')
const { hookRunner, hookIterator } = require('./hooks')

module.exports.onRunMiddlewares = function onRunMiddlewares (err, req, res, reply) {
  if (err != null) {
    reply.send(err)
    return
  }

  if (reply.context.preParsing !== null) {
    hookRunner(
      reply.context.preParsing,
      hookIterator,
      reply.request,
      reply,
      handleRequest
    )
  } else {
    handleRequest(null, reply.request, reply)
  }
}
