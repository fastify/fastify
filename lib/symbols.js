'use strict'

const keys = {
  childrenKey: Symbol('fastify.children'),
  bodyLimitKey: Symbol('fastify.bodyLimit'),
  routePrefixKey: Symbol('fastify.routePrefix'),
  logLevelKey: Symbol('fastify.logLevel'),
  hooksKey: Symbol('fastify.hooks'),
  schemasKey: Symbol('fastify.schemas'),
  contentTypeParserKey: Symbol('fastify.contentTypeParser'),
  ReplyKey: Symbol('fastify.Reply'),
  RequestKey: Symbol('fastify.Request'),
  middlewaresKey: Symbol('fastify.middlewares'),
  canSetNotFoundHandlerKey: Symbol('fastify.canSetNotFoundHandler'),
  fourOhFourLevelInstanceKey: Symbol('fastify.404LogLevelInstance'),
  fourOhFourContextKey: Symbol('fastify.404ContextKey')
}

module.exports = keys
