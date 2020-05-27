import { FastifyLoggerInstance } from './logger'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './utils'

export interface RequestGenericInterface {
  Body?: RequestBodyDefault;
  Querystring?: RequestQuerystringDefault;
  Params?: RequestParamsDefault;
  Headers?: RequestHeadersDefault;
}

/**
 * FastifyRequest is an instance of the standard http or http2 request objects.
 * It defaults to http.IncomingMessage, and it also extends the relative request object.
 */
export interface FastifyRequestInterface<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface
> {
  body: RequestGeneric['Body'];
  id: any;
  log: FastifyLoggerInstance;
  params: RequestGeneric['Params'];
  query: RequestGeneric['Querystring'];
  raw: RawRequest;
  headers: RawRequest['headers'] & RequestGeneric['Headers']; // this enables the developer to extend the existing http(s|2) headers list
}

export type FastifyRequest<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface
> = RawRequest & FastifyRequestInterface<RawServer, RawRequest, RequestGeneric>
