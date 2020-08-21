import { FastifyLoggerInstance } from './logger'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './utils'
import { RouteGenericInterface } from './route'

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
export interface FastifyRequest<
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
> {
  id: any;
  params: RouteGeneric['Params'];
  raw: RawRequest;
  query: RouteGeneric['Querystring'];
  headers: RawRequest['headers'] & RouteGeneric['Headers']; // this enables the developer to extend the existing http(s|2) headers list
  log: FastifyLoggerInstance;
  body: RouteGeneric['Body'];
  ip: string;
  ips?: string[];
  hostname: string;
  url: string;
  method: string;
  routerPath: string;
  routerMethod: string;
  is404: boolean;
  /** in order for this to be used the user should ensure they have set the attachValidation option. */
  validationError?: Error & { validation: any; validationContext: string };

  // `connection` is a deprecated alias for `socket` and doesn't exist in `Http2ServerRequest`
  connection: RawRequest['socket'];
}
