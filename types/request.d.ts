import { FastifyContext } from './context'
import { FastifyInstance } from './instance'
import { DefaultFastifyInstanceRouteGenericInterface, FastifyInstanceRouteGenericInterface } from './route'
import { FastifyRequestType, ResolveFastifyRequestType } from './type-provider'
import { GetLogger, GetProp, GetRequest, GetRoute, GetRouteContext, RequestBodyDefault, RequestHeadersDefault, RequestParamsDefault, RequestQuerystringDefault } from './utils'

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
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface,
  RequestType extends FastifyRequestType = ResolveFastifyRequestType<Generic>
> {
  id: any;
  params: RequestType['params'];
  raw: GetRequest<Generic>;
  query: RequestType['query'];
  headers: GetProp<GetRequest<Generic>, 'headers'> & RequestType['headers']; // this enables the developer to extend the existing http(s|2) headers list
  log: GetLogger<Generic>;
  server: FastifyInstance<Generic>;
  body: RequestType['body'];
  context: FastifyContext<GetRouteContext<Generic>>;

  /** in order for this to be used the user should ensure they have set the attachValidation option. */
  validationError?: Error & { validation: any; validationContext: string };

  /**
  * @deprecated Use `raw` property
  */
  readonly req: GetRequest<Generic> & GetProp<GetRoute<Generic>, 'Headers'>; // this enables the developer to extend the existing http(s|2) headers list
  readonly ip: string;
  readonly ips?: string[];
  readonly hostname: string;
  readonly url: string;
  readonly protocol: 'http' | 'https';
  readonly method: string;
  readonly routerPath: string;
  readonly routerMethod: string;
  readonly is404: boolean;
  readonly socket: GetProp<GetRequest<Generic>, 'socket'>;

  // Prefer `socket` over deprecated `connection` property in node 13.0.0 or higher
  // @deprecated
  readonly connection: GetProp<GetRequest<Generic>, 'socket'>;
}
