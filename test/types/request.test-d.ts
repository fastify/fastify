import * as http from 'http'
import { expectType } from 'tsd'
import fastify, { FastifyContext, FastifyContextConfig, RequestBodyDefault, RequestGenericInterface, RouteHandler } from '../../fastify'
import { FastifyInstance } from '../../types/instance'
import { FastifyLoggerInstance } from '../../types/logger'
import { FastifyReply } from '../../types/reply'
import { FastifyRequest } from '../../types/request'
import { RequestHeadersDefault, RequestParamsDefault, RequestQuerystringDefault, RouteContextDefault } from '../../types/utils'

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

type Handler = RouteHandler<{ Route: RequestData }>

type CustomRequest = FastifyRequest<{
  Route: {
    Body: RequestBody;
    Querystring: RequestQuerystring;
    Params: RequestParams;
    Headers: RequestHeaders;
  }
}>

const getHandler: RouteHandler = function (request, _reply) {
  expectType<string>(request.url)
  expectType<string>(request.method)
  expectType<string>(request.routerPath)
  expectType<string>(request.routerMethod)
  expectType<boolean>(request.is404)
  expectType<string>(request.hostname)
  expectType<string>(request.ip)
  expectType<string[] | undefined>(request.ips)
  expectType<http.IncomingMessage>(request.raw)
  expectType<RequestBodyDefault>(request.body)
  expectType<RequestParamsDefault>(request.params)
  expectType<FastifyContext<RouteContextDefault>>(request.context)
  expectType<FastifyContextConfig>(request.context.config)

  expectType<RequestHeadersDefault & http.IncomingMessage['headers']>(request.headers)
  request.headers = {}

  expectType<RequestQuerystringDefault>(request.query)
  expectType<any>(request.id)
  expectType<FastifyLoggerInstance>(request.log)
  expectType<http.IncomingMessage['socket']>(request.socket)
  expectType<Error & { validation: any; validationContext: string } | undefined>(request.validationError)
  expectType<FastifyInstance>(request.server)
}

const postHandler: Handler = function (request) {
  expectType<RequestBody>(request.body)
  expectType<RequestParams>(request.params)
  expectType<RequestHeaders & http.IncomingMessage['headers']>(request.headers)
  expectType<RequestQuerystring>(request.query)
  expectType<string>(request.body.content)
  expectType<string>(request.query.from)
  expectType<number>(request.params.id)
  expectType<string>(request.headers['x-foobar'])
  expectType<FastifyInstance>(request.server)
  expectType<FastifyContext<RouteContextDefault>>(request.context)
  expectType<FastifyContextConfig>(request.context.config)
}

function putHandler (request: CustomRequest, reply: FastifyReply) {
  expectType<RequestBody>(request.body)
  expectType<RequestParams>(request.params)
  expectType<RequestHeaders & http.IncomingMessage['headers']>(request.headers)
  expectType<RequestQuerystring>(request.query)
  expectType<string>(request.body.content)
  expectType<string>(request.query.from)
  expectType<number>(request.params.id)
  expectType<string>(request.headers['x-foobar'])
  expectType<FastifyInstance>(request.server)
  expectType<FastifyContext<RouteContextDefault>>(request.context)
  expectType<FastifyContextConfig>(request.context.config)
}

const server = fastify()
server.get('/get', getHandler)
server.post('/post', postHandler)
server.put('/put', putHandler)
