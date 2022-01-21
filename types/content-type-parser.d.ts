
type ContentTypeParserDoneFunction = (err: Error | null, body?: any) => void

/**
 * Body parser method that operators on request body
 */
// export type FastifyBodyParser<
//   RawBody extends string | Buffer,
//   RawServer extends RawServerBase = RawServerDefault,
//   RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
//   RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
//   SchemaCompiler extends FastifySchema = FastifySchema,
//   TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
// > = ((request: FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider>, rawBody: RawBody, done: ContentTypeParserDoneFunction) => void)
// | ((request: FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider>, rawBody: RawBody) => Promise<any>)

// /**
//  * Content Type Parser method that operates on request content
//  */
// export type FastifyContentTypeParser<
//   RawServer extends RawServerBase = RawServerDefault,
//   RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
//   RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
//   SchemaCompiler extends FastifySchema = FastifySchema,
//   TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
// > = ((request: FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider>, payload: RawRequest) => Promise<any>)
// | ((request: FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider>, payload: RawRequest, done: ContentTypeParserDoneFunction) => void)

// /**
//  * Natively, Fastify only supports 'application/json' and 'text/plain' content types. The default charset is utf-8. If you need to support different content types, you can use the addContentTypeParser API. The default JSON and/or plain text parser can be changed.
//  */
// export interface AddContentTypeParser<
//   RawServer extends RawServerBase = RawServerDefault,
//   RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
//   RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
//   SchemaCompiler extends FastifySchema = FastifySchema,
//   TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
// > {
//   (
//     contentType: string | string[] | RegExp,
//     opts: {
//       bodyLimit?: number;
//     },
//     parser: FastifyContentTypeParser<RawServer, RawRequest, RouteGeneric, SchemaCompiler, TypeProvider>
//   ): void;
//   (contentType: string | string[] | RegExp, parser: FastifyContentTypeParser<RawServer, RawRequest, RouteGeneric, SchemaCompiler, TypeProvider>): void;
//   <parseAs extends string | Buffer>(
//     contentType: string | string[] | RegExp,
//     opts: {
//       parseAs: parseAs extends Buffer ? 'buffer' : 'string';
//       bodyLimit?: number;
//     },
//     parser: FastifyBodyParser<parseAs, RawServer, RawRequest, RouteGeneric, SchemaCompiler, TypeProvider>
//   ): void;
// }

/**
 * Checks for a type parser of a content type
 */
export type HasContentTypeParser = (contentType: string | RegExp) => boolean

export type ProtoAction = 'error' | 'remove' | 'ignore'

export type ConstructorAction = 'error' | 'remove' | 'ignore'

export type GetDefaultJsonParser = (onProtoPoisoning: ProtoAction, onConstructorPoisoning: ConstructorAction) => any

export type RemoveContentTypeParser = (contentType: string | RegExp | (string | RegExp)[]) => void

export type RemoveAllContentTypeParsers = () => void
