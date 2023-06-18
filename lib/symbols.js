'use strict'

const keys = {
  kAvvioBoot: Symbol('fastify.avvioBoot'),
  kChildren: Symbol('fastify.children'),
  kServerBindings: Symbol('fastify.serverBindings'),
  kBodyLimit: Symbol('fastify.bodyLimit'),
  kRoutePrefix: Symbol('fastify.routePrefix'),
  kLogLevel: Symbol('fastify.logLevel'),
  kLogSerializers: Symbol('fastify.logSerializers'),
  kHooks: Symbol('fastify.hooks'),
  kContentTypeParser: Symbol('fastify.contentTypeParser'),
  kState: Symbol('fastify.state'),
  kOptions: Symbol('fastify.options'),
  kDisableRequestLogging: Symbol('fastify.disableRequestLogging'),
  kPluginNameChain: Symbol('fastify.pluginNameChain'),
  kRouteContext: Symbol('fastify.context'),
  kPublicRouteContext: Symbol('fastify.routeOptions'),
  // Schema
  kSchemaController: Symbol('fastify.schemaController'),
  kSchemaHeaders: Symbol('headers-schema'),
  kSchemaParams: Symbol('params-schema'),
  kSchemaQuerystring: Symbol('querystring-schema'),
  kSchemaBody: Symbol('body-schema'),
  kSchemaResponse: Symbol('response-schema'),
  kSchemaErrorFormatter: Symbol('fastify.schemaErrorFormatter'),
  kSchemaVisited: Symbol('fastify.schemas.visited'),
  // Request
  kRequest: Symbol('fastify.Request'),
  kRequestPayloadStream: Symbol('fastify.RequestPayloadStream'),
  kRequestAcceptVersion: Symbol('fastify.RequestAcceptVersion'),
  kRequestCacheValidateFns: Symbol('fastify.request.cache.validateFns'),
  kRequestOriginalUrl: Symbol('fastify.request.originalUrl'),
  // 404
  kFourOhFour: Symbol('fastify.404'),
  kCanSetNotFoundHandler: Symbol('fastify.canSetNotFoundHandler'),
  kFourOhFourLevelInstance: Symbol('fastify.404LogLevelInstance'),
  kFourOhFourContext: Symbol('fastify.404ContextKey'),
  kDefaultJsonParse: Symbol('fastify.defaultJSONParse'),
  // Reply
  kReply: Symbol('fastify.Reply'),
  kReplySerializer: Symbol('fastify.reply.serializer'),
  kReplyIsError: Symbol('fastify.reply.isError'),
  kReplyHeaders: Symbol('fastify.reply.headers'),
  kReplyTrailers: Symbol('fastify.reply.trailers'),
  kReplyHasStatusCode: Symbol('fastify.reply.hasStatusCode'),
  kReplyHijacked: Symbol('fastify.reply.hijacked'),
  kReplyStartTime: Symbol('fastify.reply.startTime'),
  kReplyNextErrorHandler: Symbol('fastify.reply.nextErrorHandler'),
  kReplyEndTime: Symbol('fastify.reply.endTime'),
  kReplyErrorHandlerCalled: Symbol('fastify.reply.errorHandlerCalled'),
  kReplyIsRunningOnErrorHook: Symbol('fastify.reply.isRunningOnErrorHook'),
  kReplySerializerDefault: Symbol('fastify.replySerializerDefault'),
  kReplyCacheSerializeFns: Symbol('fastify.reply.cache.serializeFns'),
  // This symbol is only meant to be used for fastify tests and should not be used for any other purpose
  kTestInternals: Symbol('fastify.testInternals'),
  kErrorHandler: Symbol('fastify.errorHandler'),
  kChildLoggerFactory: Symbol('fastify.childLoggerFactory'),
  kHasBeenDecorated: Symbol('fastify.hasBeenDecorated'),
  kKeepAliveConnections: Symbol('fastify.keepAliveConnections'),
  kRouteByFastify: Symbol('fastify.routeByFastify')
}

module.exports = keys
