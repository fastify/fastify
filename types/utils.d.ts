import * as http from 'http'
import { FastifyInstanceGenericInterface } from './instance'
import { FastifyLoggerInstance } from './logger'
import { FastifyInstanceRouteGenericInterface, RouteGenericInterface } from './route'
import { FastifySchema } from './schema'
import { FastifyTypeProviderDefault } from './type-provider'

/**
 * Standard HTTP method strings
 */
export type HTTPMethods = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'OPTIONS'

export type FastifyInstanceServerDefault = http.Server
export type FastifyInstanceRequestDefault = http.IncomingMessage
export type FastifyInstanceReplyDefault = http.ServerResponse
export type FastifyInstanceLoggerDefault = FastifyLoggerInstance

export type RequestBodyDefault = unknown
export type RequestQuerystringDefault = unknown
export type RequestParamsDefault = unknown
export type RequestHeadersDefault = unknown

export type RouteContextDefault = unknown
export type ReplyDefault = unknown

/**
 * The below getter is used to ensure the option to not
 * fall into unknown. It always fallback to the default.
 */
export type GetServer<Generic extends FastifyInstanceGenericInterface> = Generic['Server'] extends never | unknown | undefined ? FastifyInstanceServerDefault : Generic['Server']
export type GetRequest<Generic extends FastifyInstanceGenericInterface> = Generic['Request'] extends never | unknown | undefined ? FastifyInstanceRequestDefault : Generic['Request']
export type GetReply<Generic extends FastifyInstanceGenericInterface> = Generic['Reply'] extends never | unknown | undefined ? FastifyInstanceReplyDefault : Generic['Reply']
export type GetLogger<Generic extends FastifyInstanceGenericInterface> = Generic['Logger'] extends never | unknown | undefined ? FastifyInstanceLoggerDefault : Generic['Logger']
export type GetTypeProvider<Generic extends FastifyInstanceGenericInterface> = Generic['TypeProvider'] extends never | unknown | undefined ? FastifyTypeProviderDefault : Generic['TypeProvider']
export type GetRoute<Generic extends FastifyInstanceRouteGenericInterface> = Generic['Route'] extends never | unknown | undefined ? RouteGenericInterface : Generic['Route']
export type GetRouteContext<Generic extends FastifyInstanceRouteGenericInterface> = Generic['Context'] extends never | unknown | undefined ? RouteContextDefault : Generic['Context']
export type GetRouteReply<Generic extends FastifyInstanceRouteGenericInterface> = Generic['Reply'] extends never | unknown | undefined ? ReplyDefault : Generic['Reply']
export type GetRouteSchema<Generic extends FastifyInstanceRouteGenericInterface> = Generic['Schema'] extends never | unknown | undefined ? FastifySchema : Generic['Schema']
export type GetProp<From, Prop extends keyof From> = From[Prop]
