import { FastifyLoggerOptions } from './logger'
import { RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './utils'

/**
 * FastifyRequest is an instance of the standard http or http2 request objects.
 * It defaults to http.IncomingMessage, and it also extends the relative request object.
 */
export type FastifyRequest<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RequestBody = RequestBodyDefault,
  RequestQuerystring = RequestQuerystringDefault,
  RequestParams = RequestParamsDefault,
  RequestHeaders = RequestHeadersDefault // currently unused; how do we extend header list?
> = RawRequest & {
  body: RequestBody;
  id: any;
  log: FastifyLoggerOptions<RawServer>;
  params: RequestParams;
  query: RequestQuerystring;
  raw: RawRequest;
}
