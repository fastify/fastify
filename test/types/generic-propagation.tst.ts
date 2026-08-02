import * as http from 'node:http'
import { expect } from 'tstyche'
import fastify, {
  ContextConfigDefault,
  FastifyBaseLogger,
  FastifyInstance,
  FastifyReply,
  FastifySchema,
  RouteGenericInterface,
  RouteHandlerMethod,
  SafePromiseLike,
  FastifyTypeProvider
} from '../../fastify.js'
import { LogController } from '../../types/logger.js'
import { RouteConstraintType } from '../../types/route.js'

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

type CustomRouteRequest = Parameters<CustomRouteHandler>[0]
type CustomRouteReply = Parameters<CustomRouteHandler>[1]
type CustomConstraintRequest = Parameters<RouteConstraintType<http.Server, CustomRawRequest>['deriveConstraint']>[0]

expect<CustomConstraintRequest>().type.toBe<CustomRawRequest>()

class CustomLogController extends LogController<CustomRouteRequest, CustomRouteReply, CustomLogger, CustomApp> {
  override serviceUnavailable (logger: CustomLogger, server: CustomApp): void {
    expect(logger).type.toBe<CustomLogger>()
    expect(server).type.toBe<CustomApp>()
  }
}

const customRouteHandler: CustomRouteHandler = function (request, reply) {
  expect(request.server).type.toBe<CustomApp>()
  expect(request.routeOptions.handler).type.toBe<CustomRouteHandler>()

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
  logController: new CustomLogController(),
  genReqId (request) {
    expect(request).type.toBe<CustomRawRequest>()
    return 'request-id'
  },
  disableRequestLogging (request) {
    expect(request.log).type.toBe<CustomLogger>()
    expect(request.server).type.toBe<CustomApp>()
    return false
  },
  routerOptions: {
    defaultRoute (request, reply) {
      expect(request).type.toBe<CustomRawRequest>()
      expect(reply).type.toBe<CustomRawReply>()
    },
    onBadUrl (_path, request, reply) {
      expect(request).type.toBe<CustomRawRequest>()
      expect(reply).type.toBe<CustomRawReply>()
    }
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

fastify<http.Server, CustomRawRequest, CustomRawReply, CustomLogger, CustomProvider>({
  logger: {
    serializers: {
      req (request) {
        expect(request.log).type.toBe<CustomLogger>()
        expect(request.server).type.toBe<CustomApp>()
        return {}
      }
    }
  }
})

declare const directReply: FastifyReply<
  RouteGenericInterface,
  http.Server,
  CustomRawRequest,
  CustomRawReply,
  ContextConfigDefault,
  FastifySchema,
  CustomProvider,
  unknown,
  CustomLogger
>

expect(directReply.server).type.toBe<CustomApp>()
expect(directReply.request.log).type.toBe<CustomLogger>()
expect(directReply.request.server).type.toBe<CustomApp>()

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

app.addHook('onRoute', function (options) {
  expect(this).type.toBe<CustomApp>()
  expect(options.handler).type.toBe<CustomRouteHandler>()
})

app.addContentTypeParser('application/custom', function (request, _payload, done) {
  expect(request.log).type.toBe<CustomLogger>()
  expect(request.server).type.toBe<CustomApp>()
  done(null)
})

app.register(function (instance, _options, done) {
  expect(instance).type.toBe<CustomApp>()
  done()
}, (instance) => {
  expect(instance).type.toBe<CustomApp>()
  return {}
})

app.decorateRequest('customGetter', {
  getter () {
    expect(this.log).type.toBe<CustomLogger>()
    expect(this.server).type.toBe<CustomApp>()
    return true
  }
})

app.decorateReply('customGetter', {
  getter () {
    expect(this.log).type.toBe<CustomLogger>()
    expect(this.server).type.toBe<CustomApp>()
    return true
  }
})

app.errorHandler = function (_error, request, reply) {
  expect(request.log).type.toBe<CustomLogger>()
  expect(request.server.log).type.toBe<CustomLogger>()
  expect(reply.log).type.toBe<CustomLogger>()
  expect(reply.server.log).type.toBe<CustomLogger>()
}

expect(app.setSchemaController({})).type.toBe<CustomApp>()
