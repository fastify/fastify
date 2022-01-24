import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

type HTTPServer = http2.Http2SecureServer | http2.Http2Server | https.Server | http.Server

export type FastifyServerFactoryHandler<
  RawServer extends HTTPServer = http.Server
> = RawServer extends http.Server | https.Server ?
  (request: http.IncomingMessage, response: http.ServerResponse) => void :
  (request: http2.Http2ServerRequest, response: http2.Http2ServerResponse) => void

export interface FastifyServerFactory<
  RawServer extends HTTPServer = http.Server
> {
  (handler: FastifyServerFactoryHandler<RawServer>, opts: Record<string, unknown>): RawServer;
}
