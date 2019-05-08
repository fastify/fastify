'use strict'

const Middie = require('middie')
const handleRequest = require('./handleRequest')
const { hookRunner, hookIterator } = require('./hooks')

function onRunMiddlewares (err, req, res, reply) {
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
module.exports.onRunMiddlewares = onRunMiddlewares

module.exports.buildMiddie = function buildMiddie (middlewares) {
  if (!middlewares.length) {
    return null
  }

  const middie = Middie(onRunMiddlewares)
  for (var i = 0; i < middlewares.length; i++) {
    middie.use.apply(middie, middlewares[i])
  }

  return middie
}
