import { RouteGenericInterface } from './route'
import { FastifySchema } from './schema'
import { RecordKeysToLowercase } from './utils'

// -----------------------------------------------------------------------------------------------
// TypeProvider
// -----------------------------------------------------------------------------------------------

export interface FastifyTypeProvider {
  readonly input: unknown,
  readonly output: unknown,
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FastifyTypeProviderDefault extends FastifyTypeProvider {}

export type CallTypeProvider<F extends FastifyTypeProvider, I> = (F & { input: I })['output']

// -----------------------------------------------------------------------------------------------
// FastifyRequestType
// -----------------------------------------------------------------------------------------------

// Used to map undefined SchemaCompiler properties to unknown
//   Without brackets, UndefinedToUnknown<undefined | null> => unknown
type UndefinedToUnknown<T> = [T] extends [undefined] ? unknown : T

// union-aware keyof operator
//    keyof ({ a: number} | { b: number}) => never
//    KeysOf<{a: number} | {b: number}>   => "a" | "b"
// this exists to allow users to override faulty type-provider logic.
type KeysOf<T> = T extends any ? keyof T : never

// Resolves Request types either from generic argument or Type Provider.
type ResolveRequestParams<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema, RouteGeneric extends RouteGenericInterface> =
  UndefinedToUnknown<KeysOf<RouteGeneric['Params']> extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['params']> : RouteGeneric['Params']>
type ResolveRequestQuerystring<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema, RouteGeneric extends RouteGenericInterface> =
  UndefinedToUnknown<KeysOf<RouteGeneric['Querystring']> extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['querystring']> : RouteGeneric['Querystring']>
type ResolveRequestHeaders<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema, RouteGeneric extends RouteGenericInterface> =
  UndefinedToUnknown<KeysOf<RouteGeneric['Headers']> extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['headers']> : RouteGeneric['Headers']>
type ResolveRequestBody<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema, RouteGeneric extends RouteGenericInterface> =
  UndefinedToUnknown<KeysOf<RouteGeneric['Body']> extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['body']> : RouteGeneric['Body']>

// The target request type. This type is inferenced on fastify 'requests' via generic argument assignment
export interface FastifyRequestType<Params = unknown, Querystring = unknown, Headers = unknown, Body = unknown> {
  params: Params,
  query: Querystring,
  headers: Headers,
  body: Body
}

// Resolves the FastifyRequest generic parameters
export interface ResolveFastifyRequestType<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema, RouteGeneric extends RouteGenericInterface> extends FastifyRequestType {
  params: ResolveRequestParams<TypeProvider, SchemaCompiler, RouteGeneric>,
  query: ResolveRequestQuerystring<TypeProvider, SchemaCompiler, RouteGeneric>,
  headers: RecordKeysToLowercase<ResolveRequestHeaders<TypeProvider, SchemaCompiler, RouteGeneric>>,
  body: ResolveRequestBody<TypeProvider, SchemaCompiler, RouteGeneric>
}

// -----------------------------------------------------------------------------------------------
// FastifyReplyType
// -----------------------------------------------------------------------------------------------

// Resolves the Reply type by taking a union of response status codes and content-types
type ResolveReplyFromSchemaCompiler<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema> = {
  [K1 in keyof SchemaCompiler['response']]: SchemaCompiler['response'][K1] extends { content: { [keyof: string]: { schema: unknown } } } ? ({
    [K2 in keyof SchemaCompiler['response'][K1]['content']]: CallTypeProvider<TypeProvider, SchemaCompiler['response'][K1]['content'][K2]['schema']>
  } extends infer Result ? Result[keyof Result] : unknown) : CallTypeProvider<TypeProvider, SchemaCompiler['response'][K1]>
} extends infer Result ? Result[keyof Result] : unknown;

// The target reply type. This type is inferenced on fastify 'replies' via generic argument assignment
export type FastifyReplyType<Reply = unknown> = Reply

// Resolves the Reply type either via generic argument or from response schema. This type uses a different
// resolution strategy to Requests where the Reply will infer a union of each status code type specified
// by the user. The Reply can be explicitly overriden by users providing a generic Reply type on the route.
export type ResolveFastifyReplyType<TypeProvider extends FastifyTypeProvider, SchemaCompiler extends FastifySchema, RouteGeneric extends RouteGenericInterface> = UndefinedToUnknown<KeysOf<RouteGeneric['Reply']> extends never ? ResolveReplyFromSchemaCompiler<TypeProvider, SchemaCompiler> : RouteGeneric['Reply']>

// -----------------------------------------------------------------------------------------------
// FastifyReplyReturnType
// -----------------------------------------------------------------------------------------------

// The target reply return type. This type is inferenced on fastify 'routes' via generic argument assignment
export type ResolveFastifyReplyReturnType<
  TypeProvider extends FastifyTypeProvider,
  SchemaCompiler extends FastifySchema,
  RouteGeneric extends RouteGenericInterface,
> = ResolveFastifyReplyType<
TypeProvider,
SchemaCompiler,
RouteGeneric
> extends infer Return ?
  (Return | void | Promise<Return | void>)
// review: support both async and sync return types
// (Promise<Return> | Return | Promise<void> | void)
  : unknown
