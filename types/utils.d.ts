import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'
import { FastifyInstance } from '../fastify';

export type HTTPMethods = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'OPTIONS'

export type RawServerBase = http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer
export type RawRequestBase = http.IncomingMessage | http2.Http2ServerRequest
export type RawReplyBase = http.ServerResponse | http2.Http2ServerResponse

export type RawServerDefault = http.Server
export type RawRequestDefault<RawServer = RawServerDefault> = RawServer extends http.Server | https.Server ? http.IncomingMessage : http2.Http2ServerRequest
export type RawReplyDefault<RawServer = RawServerDefault> = RawServer extends http.Server | https.Server ? http.ServerResponse : http2.Http2ServerResponse