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
  canSetNotFoundHandlerKey: Symbol('fastify.canSetNotFoundHandler')
}
// these are here as otherwise linter throws Unnecessary computed property'
// but actually if you want a property to start with a digit, bracket syntax is necessary
keys['404LevelInstanceKey'] = Symbol('fastify.404LogLevelInstance')
keys['404ContextKey'] = Symbol('fastify.404ContextKey')

Object.freeze(keys)

module.exports = keys
