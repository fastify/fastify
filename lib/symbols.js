'use strict'

const keys = {
  kChildren: Symbol('fastify.children'),
  kBodyLimit: Symbol('fastify.bodyLimit'),
  kRoutePrefix: Symbol('fastify.routePrefix'),
  kLogLevel: Symbol('fastify.logLevel'),
  kHooks: Symbol('fastify.hooks'),
  kSchemas: Symbol('fastify.schemas'),
  kSchemaCompiler: Symbol('fastify.schemaCompiler'),
  kSchemaResolver: Symbol('fastify.schemaRefResolver'),
  kReplySerializerDefault: Symbol('fastify.replySerializerDefault'),
  kContentTypeParser: Symbol('fastify.contentTypeParser'),
  kReply: Symbol('fastify.Reply'),
  kRequest: Symbol('fastify.Request'),
  kMiddlewares: Symbol('fastify.middlewares'),
  kCanSetNotFoundHandler: Symbol('fastify.canSetNotFoundHandler'),
  kFourOhFour: Symbol('fastify.404'),
  kFourOhFourLevelInstance: Symbol('fastify.404LogLevelInstance'),
  kFourOhFourContext: Symbol('fastify.404ContextKey'),
  kDefaultJsonParse: Symbol('fastify.defaultJSONParse'),
  kReplySerializer: Symbol('fastify.reply.serializer'),
  kReplyIsError: Symbol('fastify.reply.isError'),
  kReplyHeaders: Symbol('fastify.reply.headers'),
  kReplyHasStatusCode: Symbol('fastify.reply.hasStatusCode'),
  kReplySent: Symbol('fastify.reply.sent'),
  kReplySentOverwritten: Symbol('fastify.reply.sentOverwritten'),
  kReplyStartTime: Symbol('fastify.reply.startTime'),
  kReplyErrorHandlerCalled: Symbol('fastify.reply.errorHandlerCalled'),
  kReplyIsRunningOnErrorHook: Symbol('fastify.reply.isRunningOnErrorHook'),
  kState: Symbol('fastify.state'),
  kOptions: Symbol('fastify.options'),
  kGlobalHooks: Symbol('fastify.globalHooks'),
  kDisableRequestLogging: Symbol('fastify.disableRequestLogging'),
  kPluginNameChain: Symbol('fastify.pluginNameChain')
}

module.exports = keys
