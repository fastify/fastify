import { FastifyLoggerOptions } from './logger'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './utils'

/**
 * FastifyRequest is an instance of the standard http or http2 request objects.
 * It defaults to http.IncomingMessage, and it also extends the relative request object.
 */
export type FastifyRequest<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RequestBody = RequestBodyDefault,
  RequestQuerystring = RequestQuerystringDefault,
  RequestParams = RequestParamsDefault,
  RequestHeaders = RequestHeadersDefault
> = RawRequest & {
  body: RequestBody;
  id: any;
  log: FastifyLoggerOptions<RawServer>;
  params: RequestParams;
  query: RequestQuerystring;
  raw: RawRequest;
  headers: RawRequest['headers'] & RequestHeaders; // this enables the developer to extend the existing http(s|2) headers list
}
