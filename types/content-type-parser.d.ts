import { Buffer } from "buffer";
import { RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault } from './utils';


export type FastifyBodyParser<
  RawBody extends string | Buffer,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
> = ((req: RawRequest, rawBody: RawBody, done: (err: Error | null, body?: any) => void) => void)
  | ((req: RawRequest, rawBody: RawBody) => Promise<any>)

export type FastifyContentTypeParser<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>
> = ((req: RawRequest, done: (err: Error | null, body?: any) => void) => void)
  | ((req: RawRequest) => Promise<any>)

export interface addContentTypeParser<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>
> {
  (
    contentType: string | string[],
    opts: {
      bodyLimi?: number
    },
    parser: FastifyContentTypeParser<RawServer, RawRequest>
  ): void
}

export interface addContentTypeParser<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>
> {
  (contentType: string | string[], parser: FastifyContentTypeParser<RawServer, RawRequest>): void
}

export interface addContentTypeParser<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>
>{
  <parseAs extends string | Buffer>(
    contentType: string | string[], 
    opts: { 
      parseAs: parseAs extends Buffer ? 'buffer' : 'string',
      bodyLimit?: number
    }, 
    parser: FastifyBodyParser<parseAs, RawServer, RawRequest>
  ): void
}

export type hasContentTypeParser = (contentType: string) => boolean