'use strict'

const keys = {
  kChildren: Symbol('fastify.children'),
  kBodyLimit: Symbol('fastify.bodyLimit'),
  kRoutePrefix: Symbol('fastify.routePrefix'),
  kLogLevel: Symbol('fastify.logLevel'),
  kHooks: Symbol('fastify.hooks'),
  kSchemas: Symbol('fastify.schemas'),
  kContentTypeParser: Symbol('fastify.contentTypeParser'),
  kReply: Symbol('fastify.Reply'),
  kRequest: Symbol('fastify.Request'),
  kMiddlewares: Symbol('fastify.middlewares'),
  kCanSetNotFoundHandler: Symbol('fastify.canSetNotFoundHandler'),
  kFourOhFourLevelInstance: Symbol('fastify.404LogLevelInstance'),
  kFourOhFourContext: Symbol('fastify.404ContextKey'),
  kReplySerializer: Symbol('fastify.reply.serializer'),
  kReplyIsError: Symbol('fastify.reply.isError'),
  kReplyHeaders: Symbol('fastify.reply.headers'),
  kReplyHasStatusCode: Symbol('fastify.reply.hasStatusCode'),
  kReplySent: Symbol('fastify.reply.sent'),
  kReplySentOverwritten: Symbol('fastify.reply.sentOverwritten'),
  kReplyStartTime: Symbol('fastify.reply.startTime'),
  kReplyErrorHandlerCalled: Symbol('fastify.reply.errorHandlerCalled'),
  kReplyIsRunningOnErrorHook: Symbol('fastify.reply.isRunningOnErrorHook')
}

module.exports = keys
