import { Buffer } from 'buffer'
import { FastifyReplyContext } from './context'
import { FastifyInstance } from './instance'
import { FastifyBaseLogger } from './logger'
import { FastifyRequest } from './request'
import { RouteGenericInterface } from './route'
import { FastifySchema } from './schema'
import { CallSerializerTypeProvider, FastifyReplyType, FastifyTypeProvider, FastifyTypeProviderDefault, ResolveFastifyReplyType } from './type-provider'
import { CodeToReplyKey, ContextConfigDefault, HttpKeys, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault, ReplyDefault, ReplyKeysToCodes, HttpHeader } from './utils'

export interface ReplyGenericInterface {
  Reply?: ReplyDefault;
}

type HttpCodesReplyType = Partial<Record<HttpKeys, unknown>>

type ReplyTypeConstrainer<RouteGenericReply, Code extends ReplyKeysToCodes<keyof RouteGenericReply>> =
  RouteGenericReply extends HttpCodesReplyType & Record<Exclude<keyof RouteGenericReply, keyof HttpCodesReplyType>, never> ?
    Code extends keyof RouteGenericReply ? RouteGenericReply[Code] :
      CodeToReplyKey<Code> extends keyof RouteGenericReply ? RouteGenericReply[CodeToReplyKey<Code>] : unknown :
    RouteGenericReply

export type ResolveReplyTypeWithRouteGeneric<RouteGenericReply, Code extends ReplyKeysToCodes<keyof RouteGenericReply>,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault> =
  Code extends keyof SchemaCompiler['response'] ?
    CallSerializerTypeProvider<TypeProvider, SchemaCompiler['response'][Code]> :
    ResolveFastifyReplyType<TypeProvider, SchemaCompiler, { Reply: ReplyTypeConstrainer<RouteGenericReply, Code> }>
/**
 * FastifyReply is an instance of the standard http or http2 reply types.
 * It defaults to http.ServerResponse, and it also extends the relative reply object.
 */
export interface FastifyReply<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  ContextConfig = ContextConfigDefault,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  ReplyType extends FastifyReplyType = ResolveFastifyReplyType<TypeProvider, SchemaCompiler, RouteGeneric>
> {
  /**
   * This is the `http.ServerResponse` from Node core. Whilst you are using the Fastify Reply object, the use of `Reply.raw` functions is at your own risk as you are skipping all the Fastify logic of handling the HTTP response.
   * Another example of the misuse of `Reply.raw` is explained in Reply.
   * @example
   * app.get('/cookie-2', (req, reply) => {
   *   reply.setCookie('session', 'value', { secure: false }) // this will not be used
   *   // in this case we are using only the nodejs http server response object
   *   reply.raw.writeHead(200, { 'Content-Type': 'text/plain' })
   *   reply.raw.write('ok')
   *   reply.raw.end()
   * })
   */
  raw: RawReply;
  /**
   * @deprecated Access the Request's context property.
   */
  context: FastifyReplyContext<ContextConfig>;
  /**
   * Invokes the custom response time getter to calculate the amount of time passed since the request was received by Fastify.
   * Note that unless this function is called in the onResponse hook it will always return 0.
   */
  elapsedTime: number;
  /** The logger instance of the incoming request. */
  log: FastifyBaseLogger;
  /** The incoming request. */
  request: FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider>;
  /**
   * The Fastify server instance, scoped to the current encapsulation context.
   * @example
   * fastify.decorate('util', function util () {
   *   return 'foo'
   * })
   *
   * fastify.get('/', async function (req, rep) {
   *   return rep.server.util() // foo
   * })
   */
  server: FastifyInstance;
  /**
   * Set the status code of the response. If not set explicitly, the status
   * will be 200.
   */
  code<Code extends ReplyKeysToCodes<keyof RouteGeneric['Reply']>>(statusCode: Code): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, ResolveReplyTypeWithRouteGeneric<RouteGeneric['Reply'], Code, SchemaCompiler, TypeProvider>>;
  /** Alias for `.code()` */
  status<Code extends ReplyKeysToCodes<keyof RouteGeneric['Reply']>>(statusCode: Code): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, ResolveReplyTypeWithRouteGeneric<RouteGeneric['Reply'], Code, SchemaCompiler, TypeProvider>>;
  /**
   * Get or set the status code of the response. It is an alias for `reply.code()`
   * when used as a setter.
   */
  statusCode: number;
  /**
   * Whether the response has already been sent, with reply.send() or reply.hijack()
   */
  sent: boolean;
  /**
   * As the name suggests, .send() is the function that sends the payload to the end user.
   */
  send(payload?: ReplyType): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  /**
   * Sets a response header. If the value is omitted or undefined, it is coerced to ''.
   */
  header(key: HttpHeader, value: any): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  /**
   * Sets all the keys of the object as response headers. `.header` will be called under the hood.
   */
  headers(values: Partial<Record<HttpHeader, number | string | string[] | undefined>>): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  /**
   * Retrieves the value of a previously set header.
   */
  getHeader(key: HttpHeader): number | string | string[] | undefined;
  /**
   * Gets a shallow copy of all current response headers, including those set via the
   * raw `http.ServerResponse`. Note that headers set via Fastify take precedence over
   * those set via `http.ServerResponse`.
   */
  getHeaders(): Record<HttpHeader, number | string | string[] | undefined>;
  /**
   * Remove the value of a previously set header.
   * @example
   * reply.header('x-foo', 'foo')
   * reply.removeHeader('x-foo')
   * reply.getHeader('x-foo') // undefined
   */
  removeHeader(key: HttpHeader): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  /** Returns a boolean indicating if the specified header has been set. */
  hasHeader(key: HttpHeader): boolean;
  /**
   * @deprecated The `reply.redirect()` method has a new signature: `reply.reply.redirect(url: string, code?: number)`. It will be enforced in `fastify@v5`'.
   */
  redirect(statusCode: number, url: string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  /**
   * Redirects a request to the specified URL, the status code is optional, default to 302 (if status code is not already set by calling code).
   */
  redirect(url: string, statusCode?: number): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  writeEarlyHints(hints: Record<string, string | string[]>, callback?: () => void): void;
  /**
   * Sometimes you might need to halt the execution of the normal request lifecycle and handle sending the response manually.
   * To achieve this, Fastify provides the `reply.hijack()` method that can be called during the request lifecycle (At any point before `reply.send()` is called), and allows you to prevent Fastify from sending the response, and from running the remaining hooks (and user handler if the reply was hijacked before).
   *
   * If `reply.raw` is used to send a response back to the user, the `onResponse` hooks will still be executed.
   *
   * @example
   * app.get('/', (req, reply) => {
   *   reply.hijack()
   *   reply.raw.end('hello world')
   *   return Promise.resolve('this will be skipped')
   * })
   */
  hijack(): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  /**
   * Invokes the custom not found handler. Note that it will only call `preHandler` hook specified in `setNotFoundHandler`.
   */
  callNotFound(): void;
  /**
   * Sets the content type for the response. This is a shortcut for `reply.header('Content-Type', 'the/type').`
   * If the Content-Type has a JSON subtype, and the charset parameter is not set, utf-8 will be used as the charset by default.
   * @example
   * reply.type('text/html')
   */
  type(contentType: string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  /**
   * By default, `.send()` will JSON-serialize any value that is not one of `Buffer`, `stream`, `string`, `undefined`, or `Error`.
   * If you need to replace the default serializer with a custom serializer for a particular request, you can do so with the `.serializer()` utility. Be aware that if you are using a custom serializer, you must set a custom `'Content-Type'` header.
   * @example
   * reply
   *   .header('Content-Type', 'application/x-protobuf')
   *   .serializer(protoBuf.serialize)
   * @example
   * reply
   *   .header('Content-Type', 'application/x-protobuf')
   *   .send(protoBuf.serialize(data))
   */
  serializer(fn: (payload: any) => string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  /** Serializes the specified payload using the default JSON serializer or using the custom serializer (if one is set) and returns the serialized payload. */
  serialize(payload: any): string | ArrayBuffer | Buffer;
  // Serialization Methods
  getSerializationFunction(httpStatus: string, contentType?: string): ((payload: { [key: string]: unknown }) => string) | undefined;
  /** Returns the serialization function for the specified schema or http status, if any of either are set. */
  getSerializationFunction(schema: { [key: string]: unknown }): ((payload: { [key: string]: unknown }) => string) | undefined;
  /**
   * This function will compile a serialization schema and
   * return a function that can be used to serialize data.
   * The function returned (a.k.a. _serialization function_) returned is compiled
   * by using the provided `SerializerCompiler`. Also this is cached by using
   * a `WeakMap` for reducing compilation calls.
   *
   * The optional parameters `httpStatus` and `contentType`, if provided,
   * are forwarded directly to the `SerializerCompiler`, so it can be used
   * to compile the serialization function if a custom `SerializerCompiler` is used.
   *
   * This heavily depends of the `schema#responses` attached to the route, or
   * the serialization functions compiled by using `compileSerializationSchema`.
   */
  compileSerializationSchema(schema: { [key: string]: unknown }, httpStatus?: string, contentType?: string): (payload: { [key: string]: unknown }) => string;
  /**
   * This function will serialize the input data based on the provided schema
   * or HTTP status code. If both are provided the `httpStatus` will take precedence.
   *
   * If there is not a serialization function for a given `schema` a new serialization
   * function will be compiled, forwarding the `httpStatus` and `contentType` if provided.
   *
   * @example
   * ```js
   * reply
   *   .serializeInput({ foo: 'bar'}, {
   *     type: 'object',
   *     properties: {
   *       foo: {
   *         type: 'string'
   *       }
   *     }
   *   }) // '{"foo":"bar"}'
   *
   * // or
   *
   * reply
   *   .serializeInput({ foo: 'bar'}, {
   *     type: 'object',
   *     properties: {
   *       foo: {
   *         type: 'string'
   *       }
   *     }
   *   }, 200) // '{"foo":"bar"}'
   *
   * // or
   *
   * reply
   *   .serializeInput({ foo: 'bar'}, 200) // '{"foo":"bar"}'
   *
   * // or
   *
   * reply
   *   .serializeInput({ name: 'Jone', age: 18 }, '200', 'application/vnd.v1+json') // '{"name": "Jone", "age": 18}'
   * ```
   */
  serializeInput(input: { [key: string]: unknown }, schema: { [key: string]: unknown }, httpStatus?: string, contentType?: string): string;
  serializeInput(input: { [key: string]: unknown }, httpStatus: string, contentType?: string): unknown;
  then(fulfilled: () => void, rejected: (err: Error) => void): void;
  /**
   * Sets a response trailer. Trailer is usually used when you need a header that
   * requires heavy resources to be sent after the `data`, for example,
   * `Server-Timing` and `Etag`. It can ensure the client receives the response data
   * as soon as possible.
   *
   * *Note: The header `Transfer-Encoding: chunked` will be added once you use the
   * trailer. It is a hard requirement for using trailer in Node.js.*
   *
   * *Note: Any error passed to `done` callback will be ignored. If you interested
   * in the error, you can turn on `debug` level logging.*
   *
   * @example
   * ```js
   * reply.trailer('server-timing', function() {
   *   return 'db;dur=53, app;dur=47.2'
   * })
   *
   * const { createHash } = require('node:crypto')
   * // trailer function also receive two argument
   * // @param {object} reply fastify reply
   * // @param {string|Buffer|null} payload payload that already sent, note that it will be null when stream is sent
   * // @param {function} done callback to set trailer value
   * reply.trailer('content-md5', function(reply, payload, done) {
   *   const hash = createHash('md5')
   *   hash.update(payload)
   *   done(null, hash.disgest('hex'))
   * })
   *
   * // when you prefer async-await
   * reply.trailer('content-md5', async function(reply, payload) {
   *   const hash = createHash('md5')
   *   hash.update(payload)
   *   return hash.disgest('hex')
   * })
   * ```
   */
  trailer: (
    key: string,
    fn: ((reply: FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>, payload: string | Buffer | null) => Promise<string>) | ((reply: FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>, payload: string | Buffer | null, done: (err: Error | null, value?: string) => void) => void)
  ) => FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  /** Returns a boolean indicating if the specified trailer has been set. */
  hasTrailer(key: string): boolean;
  /**
   * Remove the value of a previously set trailer.
   * @example
   * reply.trailer('server-timing', function() {
   *   return 'db;dur=53, app;dur=47.2'
   * })
   * reply.removeTrailer('server-timing')
   * reply.getTrailer('server-timing') // undefined
   */
  removeTrailer(key: string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
}
