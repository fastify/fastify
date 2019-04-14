import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

import { FastifyLogger } from './logger'
import { RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault } from './utils';

/**
 * FastifyRequest is an instance of the standard http or http2 request objects.
 * It defaults to http.IncomingMessage, and it also extends the relative request object.
 */
export type FastifyRequest<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>
> = RawRequest & {
  body: any, // what to do with Body
  id: any, // declare this
  log: FastifyLogger,
  params: any, // declare this
  query: string,
  raw: RawRequest,
}