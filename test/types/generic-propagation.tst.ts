import * as http from 'node:http'
import { expect } from 'tstyche'
import fastify, {
  ContextConfigDefault,
  FastifyBaseLogger,
  FastifyInstance,
  FastifySchema,
  RouteGenericInterface,
  RouteHandlerMethod,
  SafePromiseLike,
  FastifyTypeProvider
} from '../../fastify.js'

interface CustomRawRequest extends http.IncomingMessage {
  customRequest: true
}

interface CustomRawReply extends http.ServerResponse {
  customReply: true
}

interface CustomLogger extends FastifyBaseLogger {
  customLog(message: string): void
}

interface CustomProvider extends FastifyTypeProvider {
  validator: this['schema']
  serializer: this['schema']
}

type CustomApp = FastifyInstance<
  http.Server,
  CustomRawRequest,
  CustomRawReply,
  CustomLogger,
  CustomProvider
>

declare const app: CustomApp
declare const customLogger: CustomLogger

type CustomRouteHandler = RouteHandlerMethod<
  http.Server,
  CustomRawRequest,
  CustomRawReply,
  RouteGenericInterface,
  ContextConfigDefault,
  FastifySchema,
  CustomProvider,
  CustomLogger
>

const customRouteHandler: CustomRouteHandler = function (request, reply) {
  expect(request.server).type.toBe<CustomApp>()

  expect(reply.log).type.toBe<CustomLogger>()
  expect(reply.server).type.toBe<CustomApp>()
  expect(reply.request.log).type.toBe<CustomLogger>()
  expect(reply.request.server).type.toBe<CustomApp>()
  expect(reply.request.raw).type.toBe<CustomRawRequest>()
  expect(reply.raw).type.toBe<CustomRawReply>()

  expect(reply.send().log).type.toBe<CustomLogger>()
  expect(reply.code(200).server).type.toBe<CustomApp>()
  expect(reply.header('x-test', 'yes').request.server).type.toBe<CustomApp>()
}

app.get('/custom-context', customRouteHandler)

const configuredApp = fastify<
  http.Server,
  CustomRawRequest,
  CustomRawReply,
  CustomLogger,
  CustomProvider
>({
  loggerInstance: customLogger,
  genReqId (request) {
    expect(request).type.toBe<CustomRawRequest>()
    return 'request-id'
  },
  rewriteUrl (request) {
    expect(this).type.toBe<CustomApp>()
    expect(request).type.toBe<CustomRawRequest>()
    return request.url ?? '/'
  },
  frameworkErrors (_error, request, reply) {
    expect(request.server).type.toBe<CustomApp>()
    expect(reply.log).type.toBe<CustomLogger>()
  },
  childLoggerFactory (logger, _bindings, _options, rawRequest) {
    expect(this).type.toBe<CustomApp>()
    expect(logger).type.toBe<CustomLogger>()
    expect(rawRequest).type.toBe<CustomRawRequest>()
    return logger
  },
  clientErrorHandler (_error, _socket) {
    expect(this).type.toBe<CustomApp>()
  }
})

expect(configuredApp).type.toBe<CustomApp & SafePromiseLike<CustomApp>>()

const afterHook = app.addHook('preHandler', function (request, _reply, done) {
  expect(this).type.toBe<CustomApp>()
  expect(request.log).type.toBe<CustomLogger>()
  done()
})

expect(afterHook).type.toBe<CustomApp>()

app.addHook('onReady', function (done) {
  expect(this).type.toBe<CustomApp>()
  done()
})

app.addHook('onListen', async function () {
  expect(this).type.toBe<CustomApp>()
})

app.addHook('onClose', function (instance, done) {
  expect(this).type.toBe<CustomApp>()
  expect(instance).type.toBe<CustomApp>()
  done()
})

app.addHook('preClose', async function () {
  expect(this).type.toBe<CustomApp>()
})

app.addHook('onRegister', function (instance) {
  expect(this).type.toBe<CustomApp>()
  expect(instance).type.toBe<CustomApp>()
})

const afterNotFound = app.setNotFoundHandler(function (_request, _reply) {
  expect(this).type.toBe<CustomApp>()
})

expect(afterNotFound).type.toBe<CustomApp>()

const afterErrorHandler = app.setErrorHandler(function (_error, _request, _reply) {
  expect(this).type.toBe<CustomApp>()
})

expect(afterErrorHandler).type.toBe<CustomApp>()

const afterRequestId = app.setGenReqId((request) => {
  expect(request).type.toBe<CustomRawRequest>()
  return request.customRequest ? 'custom' : 'default'
})

expect(afterRequestId).type.toBe<CustomApp>()

expect(app.setSchemaController({})).type.toBe<CustomApp>()
