import { FastifyRequest } from './request'
import { DefaultFastifyInstanceRouteGenericInterface, FastifyInstanceRouteGenericInterface } from './route'
import { GetRequest } from './utils'

type ContentTypeParserDoneFunction = (err: Error | null, body?: any) => void

/**
 * Body parser method that operators on request body
 */
export type FastifyBodyParser<
  RawBody extends string | Buffer,
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> = ((request: FastifyRequest<Generic>, rawBody: RawBody, done: ContentTypeParserDoneFunction) => void)
| ((request: FastifyRequest<Generic>, rawBody: RawBody) => Promise<any>)

/**
 * Content Type Parser method that operates on request content
 */
export type FastifyContentTypeParser<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> = ((request: FastifyRequest<Generic>, payload: GetRequest<Generic>) => Promise<any>)
| ((request: FastifyRequest<Generic>, payload: GetRequest<Generic>, done: ContentTypeParserDoneFunction) => void)

/**
 * Natively, Fastify only supports 'application/json' and 'text/plain' content types. The default charset is utf-8. If you need to support different content types, you can use the addContentTypeParser API. The default JSON and/or plain text parser can be changed.
 */
export interface AddContentTypeParser<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    contentType: string | string[] | RegExp,
    opts: {
      bodyLimit?: number;
    },
    parser: FastifyContentTypeParser<Generic>
  ): void;
  (contentType: string | string[] | RegExp, parser: FastifyContentTypeParser<Generic>): void;
  <ParseAs extends string | Buffer>(
    contentType: string | string[] | RegExp,
    opts: {
      parseAs: ParseAs extends Buffer ? 'buffer' : 'string';
      bodyLimit?: number;
    },
    parser: FastifyBodyParser<ParseAs, Generic>
  ): void;
}

/**
 * Checks for a type parser of a content type
 */
export type HasContentTypeParser = (contentType: string | RegExp) => boolean

export type ProtoAction = 'error' | 'remove' | 'ignore'

export type ConstructorAction = 'error' | 'remove' | 'ignore'

export type GetDefaultJsonParser = (onProtoPoisoning: ProtoAction, onConstructorPoisoning: ConstructorAction) => any

export type RemoveContentTypeParser = (contentType: string | RegExp | (string | RegExp)[]) => void

export type RemoveAllContentTypeParsers = () => void
