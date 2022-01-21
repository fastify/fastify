import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'
import { FastifyInstance } from './types/instance'
import { FastifyHttp2Options, FastifyHttp2SecureOptions, FastifyHttpsOptions, FastifyServerOptions } from './types/option'
import { FastifyInstanceGenericInterface } from './types/utils'


export interface FastifyInstanceHttp2SecureGenericInterface extends FastifyInstanceGenericInterface {
  Server: http2.Http2SecureServer
  Request: http2.Http2ServerRequest
  Reply: http2.Http2ServerResponse
}

export interface FastifyInstanceHttp2GenericInterface extends FastifyInstanceGenericInterface {
  Server: http2.Http2Server
  Request: http2.Http2ServerRequest
  Reply: http2.Http2ServerResponse
}

export interface FastifyInstanceHttpsGenericInterface extends FastifyInstanceGenericInterface {
  Server: https.Server
  Request: http.IncomingMessage
  Reply: http.ServerResponse
}

export interface FastifyInstanceHttpGenericInterface extends FastifyInstanceGenericInterface {
  Server: http.Server
  Request: http.IncomingMessage
  Reply: http.ServerResponse
}


declare function fastify<Generic extends FastifyInstanceHttp2SecureGenericInterface>(options: FastifyHttp2SecureOptions<Generic>): FastifyInstance<Generic>
declare function fastify<Generic extends FastifyInstanceHttp2GenericInterface>(options: FastifyHttp2Options<Generic>): FastifyInstance<Generic>
declare function fastify<Generic extends FastifyInstanceHttpsGenericInterface>(options: FastifyHttpsOptions<Generic>): FastifyInstance<Generic>
declare function fastify<Generic extends FastifyInstanceHttpGenericInterface>(options: FastifyServerOptions<Generic>): FastifyInstance<Generic>
export default fastify
export { fastify }
