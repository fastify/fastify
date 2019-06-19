import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'
import { FastifyInstance } from './instance';

/**
 * Standard HTTP method strings
 */
export type HTTPMethods = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'OPTIONS'

/**
 * A union type of the Node.js server types from the http, https, and http2 modules.
 */
export type RawServerBase = http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer

/**
 * A union type of the Node.js request types from the http and http2 modules.
 */
export type RawRequestBase = http.IncomingMessage | http2.Http2ServerRequest

/**
 * A union type of the Node.js reply types from the http and http2 modules.
 */
export type RawReplyBase = http.ServerResponse | http2.Http2ServerResponse

/**
 * The default server type
 */
export type RawServerDefault = http.Server

/**
 * The default request type based on the server type. Utilizes generic constraining.
 */
export type RawRequestDefault<RawServer = RawServerDefault> = RawServer extends http.Server | https.Server ? http.IncomingMessage : http2.Http2ServerRequest

/**
 * The default reply type based on the server type. Utilizes generic constraining.
 */
export type RawReplyDefault<RawServer = RawServerDefault> = RawServer extends http.Server | https.Server ? http.ServerResponse : http2.Http2ServerResponse

export type RequestBodyDefault = unknown
export type RequestQuerystringDefault = unknown
export type RequestParamsDefault = unknown
export type RequestHeadersDefault = unknown