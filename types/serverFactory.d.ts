import { RawServerBase, RawServerDefault, RawReplyBase, RawReplyDefault, RawRequestBase, RawRequestDefault } from "./utils";
import * as http from 'http'
import * as https from 'https'
import * as http2 from 'http2'

export interface FastifyServerFactory<
  RawServer extends RawServerBase = RawServerDefault
> {
  (handler: FastifyServerFactoryHandler<RawServer>, opts: object): RawServer
}

export type FastifyServerFactoryHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> =
  RawServer extends http.Server | https.Server ?
  (request: http.IncomingMessage & RawRequest, response: http.ServerResponse & RawReply) => void :
  (request: http2.Http2ServerRequest & RawRequest, response: http2.Http2ServerResponse & RawReply) => void