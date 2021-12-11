
import { RouteGenericInterface } from './route'
import { FastifySchema } from './schema'

// -----------------------------------------------------------------------------------------------
// TypeProvider
// -----------------------------------------------------------------------------------------------

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

type UndefinedToUnknown<T> = T extends undefined ? unknown : T

// Fastify request container type
export interface FastifyRequestType<Params = unknown, Querystring = unknown, Headers = unknown, Body = unknown> {
  params: Params,
  query: Querystring,
  headers: Headers,
  body: Body
}

// Resolves the request context. Generic arguments specificed by the caller will always override the type provider.
export type ResolveFastifyRequestType<
  TypeProvider extends FastifyTypeProvider,
  SchemaCompiler extends FastifySchema,
  RouteGeneric extends RouteGenericInterface
> = FastifyRequestType<
UndefinedToUnknown<keyof RouteGeneric['Params'] extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['params']> : RouteGeneric['Params']>,
UndefinedToUnknown<keyof RouteGeneric['Querystring'] extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['querystring']> : RouteGeneric['Querystring']>,
UndefinedToUnknown<keyof RouteGeneric['Headers'] extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['headers']> : RouteGeneric['Headers']>,
UndefinedToUnknown<keyof RouteGeneric['Body'] extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['body']> : RouteGeneric['Body']>
>

// -----------------------------------------------------------------------------------------------
// FastifyReplyType
// -----------------------------------------------------------------------------------------------

// Returns true if the user has supplied a generic argument
type UseReplyFromRouteGeneric<RouteGeneric extends RouteGenericInterface> = keyof RouteGeneric['Reply'] extends never ? false : true

// Returns true if the user has supplied a response schema
type UseReplyFromSchemaCompiler<SchemaCompiler extends FastifySchema> = keyof SchemaCompiler['response'] extends never ? false : true

// Resolves a reply context from the users generic arguments
type ResolveReplyFromRouteGeneric<RouteGeneric extends RouteGenericInterface> = RouteGeneric['Reply']

// Resolves the reply context from the schema compiler by taking a union all all specified status codes.
type ResolveReplyFromSchemaCompiler<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema> = {
  [K in keyof SchemaCompiler['response']]: CallTypeProvider<TypeProvider, SchemaCompiler['response'][K]>
} extends infer Result ? Result[keyof Result] : unknown

// Container type for the reply context
export type FastifyReplyType<Reply = unknown> = Reply

// Resolves the reply context. Generic arguments specificed by the caller will always override the type provider.
export type ResolveFastifyReplyType<
  TypeProvider extends FastifyTypeProvider,
  SchemaCompiler extends FastifySchema,
  RouteGeneric extends RouteGenericInterface,
> = FastifyReplyType<
UseReplyFromRouteGeneric<RouteGeneric> extends true ? ResolveReplyFromRouteGeneric<RouteGeneric> :
  UseReplyFromSchemaCompiler<SchemaCompiler> extends true ? ResolveReplyFromSchemaCompiler<TypeProvider, SchemaCompiler> :
    unknown
>

// Resolves the return type for fastify routes. This type is inferred from the ResolveFastifyReplyType type
export type ResolveFastifyReplyReturnType<
  TypeProvider extends FastifyTypeProvider,
  SchemaCompiler extends FastifySchema,
  RouteGeneric extends RouteGenericInterface,
> = ResolveFastifyReplyType<
TypeProvider,
SchemaCompiler,
RouteGeneric
> extends infer Return ?
  (void | Promise<Return | void>)
// review: support both async and sync return types
// (Promise<Return> | Return | Promise<void> | void)
  : unknown
