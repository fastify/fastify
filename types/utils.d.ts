import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

/**
 * Standard HTTP method strings
 */
type _HTTPMethods = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'OPTIONS' |
'PROPFIND' | 'PROPPATCH' | 'MKCOL' | 'COPY' | 'MOVE' | 'LOCK' | 'UNLOCK' | 'TRACE' | 'SEARCH'

export type HTTPMethods = Uppercase<_HTTPMethods> | Lowercase<_HTTPMethods>

/**
 * A union type of the Node.js server types from the http, https, and http2 modules.
 */
export type RawServerBase = http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer

/**
 * The default server type
 */
export type RawServerDefault = http.Server

/**
 * The default request type based on the server type. Utilizes generic constraining.
 */
export type RawRequestDefaultExpression<
  RawServer extends RawServerBase = RawServerDefault,
> = RawServer extends http.Server | https.Server ? http.IncomingMessage
  : RawServer extends http2.Http2Server | http2.Http2SecureServer ? http2.Http2ServerRequest
    : never

/**
 * The default reply type based on the server type. Utilizes generic constraining.
 */
export type RawReplyDefaultExpression<
  RawServer extends RawServerBase = RawServerDefault
> = RawServer extends http.Server | https.Server ? http.ServerResponse
  : RawServer extends http2.Http2Server | http2.Http2SecureServer ? http2.Http2ServerResponse
    : never

export type RequestBodyDefault = unknown
export type RequestQuerystringDefault = unknown
export type RequestParamsDefault = unknown
export type RequestHeadersDefault = unknown

export type ContextConfigDefault = unknown
export type ReplyDefault = unknown

/**
 * Helpers for determining the type of the response payload based on the code
 */

type WildCardKeys = {1: '1xx', 2:'2xx', 3:'3xx', 4:'4xx', 5:'5xx'};
type ResponseCodes100 = 100 | 101 | 102 | 103 | 122;
type ResponseCodes200 = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;
type ResponseCodes300 = 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;
type ResponseCodes400 = 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 421 | 422 | 423 | 424 | 425 | 426 | 428 | 429 | 431 | 451;
type ResponseCodes500 = 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;
type ResponseCodes = ResponseCodes100 | ResponseCodes200 | ResponseCodes300 | ResponseCodes400 | ResponseCodes500;
type ResponseKeys = WildCardKeys[keyof WildCardKeys] | ResponseCodes;

export type StatusCodeReply = {
  // eslint-disable-next-line no-unused-vars
  [Key in ResponseKeys]?: unknown;
};

// weird TS quirk: https://stackoverflow.com/questions/58977876/generic-conditional-type-resolves-to-never-when-the-generic-type-is-set-to-never
export type HttpCodesCovered<Key> = [Key] extends [never] ? number :
  Key extends ResponseCodes ? Key :
    Key extends `${infer X extends keyof WildCardKeys}xx` ?
      X extends 1 ? ResponseCodes100 :
        X extends 2 ? ResponseCodes200 :
          X extends 3 ? ResponseCodes300 :
            X extends 4 ? ResponseCodes400 :
              X extends 5 ? ResponseCodes500 : never : number;

export type CodeToReplyKey<Code extends ResponseKeys> = Code extends ResponseCodes100 ? '1xx' :
  Code extends ResponseCodes200 ? '2xx' :
    Code extends ResponseCodes300 ? '3xx' :
      Code extends ResponseCodes400 ? '4xx' :
        Code extends ResponseCodes500 ? '5xx' : Code;
