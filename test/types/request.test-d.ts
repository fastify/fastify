import { expectType } from 'tsd'
import pino from 'pino'
import fastify, {
  RouteHandler,
  RawRequestDefaultExpression,
  RequestBodyDefault,
  RequestGenericInterface,
  FastifyContext,
  ContextConfigDefault,
  FastifyContextConfig,
  FastifyLogFn,
  RouteHandlerMethod,
  RawServerDefault,
  RawReplyDefaultExpression,
  FastifySchema,
  FastifyTypeProviderDefault
} from '../../fastify'
import { RequestParamsDefault, RequestHeadersDefault, RequestQuerystringDefault } from '../../types/utils'
import { FastifyLoggerInstance } from '../../types/logger'
import { FastifyRequest } from '../../types/request'
import { FastifyReply } from '../../types/reply'
import { FastifyInstance } from '../../types/instance'
import { RouteGenericInterface } from '../../types/route'
import { ResolveFastifyReplyReturnType, ResolveFastifyRequestType } from '../../types/type-provider'

interface RequestBody {
  content: string;
}

interface RequestQuerystring {
  from: string;
}

interface RequestParams {
  id: number;
}

interface RequestHeaders {
  'x-foobar': string;
}

interface RequestData extends RequestGenericInterface {
  Body: RequestBody;
  Querystring: RequestQuerystring;
  Params: RequestParams;
  Headers: RequestHeaders;
}

type Handler = RouteHandler<RequestData>

type CustomRequest = FastifyRequest<{
  Body: RequestBody | undefined;
  Querystring: RequestQuerystring;
  Params: RequestParams;
  Headers: RequestHeaders;
}>

interface CustomLoggerInterface extends FastifyLoggerInstance {
  foo: FastifyLogFn; // custom severity logger method
}

const getHandler: RouteHandler = function (request, _reply) {
  expectType<string>(request.url)
  expectType<string>(request.method)
  expectType<string>(request.routerPath)
  expectType<string>(request.routerMethod)
  expectType<boolean>(request.is404)
  expectType<string>(request.hostname)
  expectType<string>(request.ip)
  expectType<string[] | undefined>(request.ips)
  expectType<RawRequestDefaultExpression>(request.raw)
  expectType<RequestBodyDefault>(request.body)
  expectType<RequestParamsDefault>(request.params)
  expectType<FastifyContext<ContextConfigDefault>>(request.context)
  expectType<FastifyContextConfig>(request.context.config)

  expectType<RequestHeadersDefault & RawRequestDefaultExpression['headers']>(request.headers)
  request.headers = {}

  expectType<RequestQuerystringDefault>(request.query)
  expectType<any>(request.id)
  expectType<FastifyLoggerInstance>(request.log)
  expectType<RawRequestDefaultExpression['socket']>(request.socket)
  expectType<Error & { validation: any; validationContext: string } | undefined>(request.validationError)
  expectType<FastifyInstance>(request.server)
}

const getHandlerWithCustomLogger: RouteHandlerMethod<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, RouteGenericInterface, ContextConfigDefault, FastifySchema, FastifyTypeProviderDefault, CustomLoggerInterface> = function (request, _reply) {
  expectType<CustomLoggerInterface>(request.log)
}

const postHandler: Handler = function (request) {
  expectType<RequestBody>(request.body)
  expectType<RequestParams>(request.params)
  expectType<RequestHeaders & RawRequestDefaultExpression['headers']>(request.headers)
  expectType<RequestQuerystring>(request.query)
  expectType<string>(request.body.content)
  expectType<string>(request.query.from)
  expectType<number>(request.params.id)
  expectType<string>(request.headers['x-foobar'])
  expectType<FastifyInstance>(request.server)
  expectType<FastifyContext<ContextConfigDefault>>(request.context)
  expectType<FastifyContextConfig>(request.context.config)
}

function putHandler (request: CustomRequest, reply: FastifyReply) {
  expectType<RequestBody | undefined>(request.body)
  expectType<RequestParams>(request.params)
  expectType<RequestHeaders & RawRequestDefaultExpression['headers']>(request.headers)
  expectType<RequestQuerystring>(request.query)
  if (typeof request.body === 'undefined') {
    expectType<undefined>(request.body)
  } else {
    expectType<string>(request.body.content)
  }
  expectType<string>(request.query.from)
  expectType<number>(request.params.id)
  expectType<string>(request.headers['x-foobar'])
  expectType<FastifyInstance>(request.server)
  expectType<FastifyContext<ContextConfigDefault>>(request.context)
  expectType<FastifyContextConfig>(request.context.config)
}

const server = fastify()
server.get('/get', getHandler)
server.post('/post', postHandler)
server.put('/put', putHandler)

const customLogger: CustomLoggerInterface = {
  level: 'info',
  version: '5.0',
  useOnlyCustomLevels: false,
  useLevelLabels: false,
  levels: { labels: [], values: {} },
  eventNames: () => [],
  listenerCount: (eventName: string | symbol) => 0,
  bindings: () => ({}),
  flush: () => () => {},
  customLevels: { foo: 1 },
  isLevelEnabled: () => false,
  levelVal: 0,
  silent: () => { },
  info: () => { },
  warn: () => { },
  error: () => { },
  fatal: () => { },
  trace: () => { },
  debug: () => { },
  foo: () => { }, // custom severity logger method
  on: (event, listener) => customLogger,
  emit: (event, listener) => false,
  off: (event, listener) => customLogger,
  addListener: (event, listener) => customLogger,
  prependListener: (event, listener) => customLogger,
  prependOnceListener: (event, listener) => customLogger,
  removeListener: (event, listener) => customLogger,
  removeAllListeners: (event) => customLogger,
  setMaxListeners: (n) => customLogger,
  getMaxListeners: () => 0,
  listeners: () => [],
  rawListeners: () => [],
  once: (event, listener) => customLogger,
  child: () => customLogger as pino.Logger<never>,
  setBindings: (bindings) => { }
}

const serverWithCustomLogger = fastify({ logger: customLogger })
expectType<
FastifyInstance<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, CustomLoggerInterface>
& PromiseLike<FastifyInstance<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, CustomLoggerInterface>>
>(serverWithCustomLogger)

serverWithCustomLogger.get('/get', getHandlerWithCustomLogger)
