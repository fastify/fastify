// -----------------------------------------------------------------------------------------------
// TypeProvider
// -----------------------------------------------------------------------------------------------

import { FastifyInstanceRouteGenericInterface, RouteGenericInterface } from './route'
import { FastifySchema } from './schema'
import { GetRoute, GetRouteSchema, GetTypeProvider } from './utils'

export interface FastifyTypeProvider {
  readonly input: unknown,
  readonly output: unknown,
}

export interface FastifyTypeProviderDefault extends FastifyTypeProvider {
  output: unknown
}

export type CallTypeProvider<F extends FastifyTypeProvider, I> = (F & { input: I })['output']

// -----------------------------------------------------------------------------------------------
// FastifyRequestType
// -----------------------------------------------------------------------------------------------

// Used to map undefined SchemaCompiler properties to unknown
type UndefinedToUnknown<T> = T extends undefined ? unknown : T

// Resolves Request types either from generic argument or Type Provider.
type ResolveRequestParams<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema, RouteGeneric extends RouteGenericInterface> =
  UndefinedToUnknown<keyof RouteGeneric['Params'] extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['params']> : RouteGeneric['Params']>
type ResolveRequestQuerystring<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema, RouteGeneric extends RouteGenericInterface> =
  UndefinedToUnknown<keyof RouteGeneric['Querystring'] extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['querystring']> : RouteGeneric['Querystring']>
type ResolveRequestHeaders<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema, RouteGeneric extends RouteGenericInterface> =
  UndefinedToUnknown<keyof RouteGeneric['Headers'] extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['headers']> : RouteGeneric['Headers']>
type ResolveRequestBody<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema, RouteGeneric extends RouteGenericInterface> =
  UndefinedToUnknown<keyof RouteGeneric['Body'] extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['body']> : RouteGeneric['Body']>

// The target request type. This type is inferenced on fastify 'requests' via generic argument assignment
export interface FastifyRequestType<Params = unknown, Querystring = unknown, Headers = unknown, Body = unknown> {
  params: Params,
  query: Querystring,
  headers: Headers,
  body: Body
}

export type ResolveFastifyRequestType<Generic extends FastifyInstanceRouteGenericInterface> = FastifyRequestType<
ResolveRequestParams<GetTypeProvider<Generic>, GetRouteSchema<Generic>, GetRoute<Generic>>,
ResolveRequestQuerystring<GetTypeProvider<Generic>, GetRouteSchema<Generic>, GetRoute<Generic>>,
ResolveRequestHeaders<GetTypeProvider<Generic>, GetRouteSchema<Generic>, GetRoute<Generic>>,
ResolveRequestBody<GetTypeProvider<Generic>, GetRouteSchema<Generic>, GetRoute<Generic>>
>

// -----------------------------------------------------------------------------------------------
// FastifyReplyType
// -----------------------------------------------------------------------------------------------

// Tests if the user has specified a generic argument for Reply
type UseReplyFromRouteGeneric<RouteGeneric extends RouteGenericInterface> = keyof RouteGeneric['Reply'] extends never ? false : true

// Tests if the user has specified a response schema.
type UseReplyFromSchemaCompiler<SchemaCompiler extends FastifySchema> = keyof SchemaCompiler['response'] extends never ? false : true

// Resolves the Reply type from the generic argument
type ResolveReplyFromRouteGeneric<RouteGeneric extends RouteGenericInterface> = RouteGeneric['Reply']

// Resolves the Reply type by taking a union of response status codes
type ResolveReplyFromSchemaCompiler<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema> = {
  [K in keyof SchemaCompiler['response']]: CallTypeProvider<TypeProvider, SchemaCompiler['response'][K]>
} extends infer Result ? Result[keyof Result] : unknown

// The target reply type. This type is inferenced on fastify 'replies' via generic argument assignment
export type FastifyReplyType<Reply = unknown> = Reply

// Resolves the Reply type either via generic argument or from response schema. This type uses a different
// resolution strategy to Requests where the Reply will infer a union of each status code type specified
// by the user. The Reply can be explicitly overriden by users providing a generic Reply type on the route.
export type ResolveFastifyReplyType<Generic extends FastifyInstanceRouteGenericInterface> = FastifyReplyType<
UseReplyFromRouteGeneric<GetRoute<Generic>> extends true ? ResolveReplyFromRouteGeneric<GetRoute<Generic>> :
  UseReplyFromSchemaCompiler<GetRouteSchema<Generic>> extends true ? ResolveReplyFromSchemaCompiler<GetTypeProvider<Generic>, GetRouteSchema<Generic>> :
    unknown
>

// -----------------------------------------------------------------------------------------------
// FastifyReplyReturnType
// -----------------------------------------------------------------------------------------------

// The target reply return type. This type is inferenced on fastify 'routes' via generic argument assignment
export type ResolveFastifyReplyReturnType<
  Generic extends FastifyInstanceRouteGenericInterface
> = ResolveFastifyReplyType<Generic> extends infer Return ?
  (void | Promise<Return | void>)
// review: support both async and sync return types
// (Promise<Return> | Return | Promise<void> | void)
  : unknown
