/// <reference types="node" />

import * as http from 'http'
import * as net from 'net'

export default interface FastifyLoggerOptions<
  HttpRequest extends http.IncomingMessage = http.IncomingMessage,
  HttpResponse extends http.OutgoingMessage = http.OutgoingMessage
> {
  serializers: {
    req: (req: HttpRequest) => {
      method: HttpRequest['method'],
      url: HttpRequest['url'],
      version: http.IncomingHttpHeaders['accept-version'],
      hostname: any, // not on http.IncomingMessage
      remoteAddress: any, // not on http.IncomingMessage
      remotePort: net.Socket['remotePort']
    },
    err: (err: Error) => {
      type: string;
      message: string;
      stack: string;
      [key: string]: any;
    },
    res: (res: HttpResponse) => {
      statusCode: any // not on http.OutgoingMessage
    }
  };
  info: WriteFn;
  error: WriteFn;
  debug: WriteFn;
  fatal: WriteFn;
  warn: WriteFn;
  trace: WriteFn;
  child: WriteFn;
  genReqId?: string;
}

type WriteFn = (o: object) => void;
