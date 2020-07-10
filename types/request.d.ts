import { FastifyLoggerInstance } from './logger'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './utils'

export interface RequestGenericInterface {
  body?: RequestBodyDefault;
  querystring?: RequestQuerystringDefault;
  params?: RequestParamsDefault;
  headers?: RequestHeadersDefault;
}

/**
 * FastifyRequest is an instance of the standard http or http2 request objects.
 * It defaults to http.IncomingMessage, and it also extends the relative request object.
 */
export interface FastifyRequest<
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
> {
  id: any;
  params: RequestGeneric['params'];
  raw: RawRequest;
  query: RequestGeneric['querystring'];
  headers: RawRequest['headers'] & RequestGeneric['headers']; // this enables the developer to extend the existing http(s|2) headers list
  log: FastifyLoggerInstance;
  body: RequestGeneric['body'];
  ip: string;
  ips?: string[];
  hostname: string;
  url: string;
  method: string;

  // `connection` is a deprecated alias for `socket` and doesn't exist in `Http2ServerRequest`
  connection: RawRequest['socket'];
}
