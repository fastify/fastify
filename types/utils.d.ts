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
type UndefinedToUnknown<T> = T extends undefined ? unknown : T
export type GetServer<Generic extends FastifyInstanceGenericInterface> = Generic['Server'] extends never | unknown | undefined ? FastifyInstanceServerDefault : NonNullable<Generic['Server']>
export type GetRequest<Generic extends FastifyInstanceGenericInterface> = Generic['Request'] extends never | unknown | undefined ? FastifyInstanceRequestDefault : NonNullable<Generic['Request']>
export type GetReply<Generic extends FastifyInstanceGenericInterface> = Generic['Reply'] extends never | unknown | undefined ? FastifyInstanceReplyDefault : NonNullable<Generic['Reply']>
export type GetLogger<Generic extends FastifyInstanceGenericInterface> = Generic['Logger'] extends never | unknown | undefined ? FastifyInstanceLoggerDefault : NonNullable<Generic['Logger']>
export type GetTypeProvider<Generic extends FastifyInstanceGenericInterface> = Generic['TypeProvider'] extends never | unknown | undefined ? FastifyTypeProviderDefault : NonNullable<Generic['TypeProvider']>
export type GetRoute<Generic extends FastifyInstanceRouteGenericInterface> = Generic['Route'] extends never | unknown | undefined ? RouteGenericInterface : NonNullable<Generic['Route']>
export type GetRouteContext<Generic extends FastifyInstanceRouteGenericInterface> = Generic['Context'] extends never | unknown | undefined ? RouteContextDefault : NonNullable<Generic['Context']>
export type GetRouteReply<Generic extends FastifyInstanceRouteGenericInterface> = Generic['Reply'] extends never | unknown | undefined ? ReplyDefault : NonNullable<Generic['Reply']>
export type GetRouteSchema<Generic extends FastifyInstanceRouteGenericInterface> = Generic['Schema'] extends never | unknown | undefined ? FastifySchema : NonNullable<Generic['Schema']>
export type GetProp<From, Prop extends keyof From> = From[Prop]
// server should be binded with request and reply
export type OverrideServer<
  Optional extends FastifyInstanceGenericInterface,
  Default extends FastifyInstanceGenericInterface
> = Optional['Server'] extends never | unknown | undefined ?
  Default : Omit<Default, 'Server'> & { Server: Optional['Server'] }
export type OverrideRequest<
  Optional extends FastifyInstanceGenericInterface,
  Default extends FastifyInstanceGenericInterface
> = Optional['Request'] extends never | unknown | undefined ?
  Default : Omit<Default, 'Request'> & { Request: Optional['Request'] }
export type OverrideGetReply<
  Optional extends FastifyInstanceGenericInterface,
  Default extends FastifyInstanceGenericInterface
> = Optional['Reply'] extends never | unknown | undefined ?
  Default : Omit<Default, 'Reply'> & { Reply: Optional['Reply'] }
export type OverrideLogger<
  Optional extends FastifyInstanceGenericInterface,
  Default extends FastifyInstanceGenericInterface
> = Optional['Logger'] extends never | unknown | undefined ?
  Default : Omit<Default, 'Logger'> & { Logger: Optional['Logger'] }
export type OverrideTypeProvider<
  Optional extends FastifyInstanceGenericInterface,
  Default extends FastifyInstanceGenericInterface
> = Optional['TypeProvider'] extends never | unknown | undefined ?
  Default : Omit<Default, 'TypeProvider'> & { TypeProvider: Optional['TypeProvider'] }
export type OverrideRoute<
  Optional extends FastifyInstanceRouteGenericInterface,
  Default extends FastifyInstanceRouteGenericInterface
> = Optional['Route'] extends never | unknown | undefined ?
  Default : Omit<Default, 'Route'> & { Route: Optional['Route'] }
export type OverrideRouteContext<
  Optional extends FastifyInstanceRouteGenericInterface,
  Default extends FastifyInstanceRouteGenericInterface
> = Optional['Context'] extends never | unknown | undefined ?
  Default : Omit<Default, 'Context'> & { Context: Optional['Context'] }
export type OverrideRouteReply<
  Optional extends FastifyInstanceRouteGenericInterface,
  Default extends FastifyInstanceRouteGenericInterface
> = Optional['Reply'] extends never | unknown | undefined ?
  Default : Omit<Default, 'Reply'> & { Reply: Optional['Reply'] }
export type OverrideRouteSchema<
  Optional extends FastifyInstanceRouteGenericInterface,
  Default extends FastifyInstanceRouteGenericInterface
> = Optional['Schema'] extends never | unknown | undefined ?
  Default : Omit<Default, 'Schema'> & { Schema: Optional['Schema'] }
export type OverrideInstanceGeneric<
  Optional extends FastifyInstanceGenericInterface,
  Default extends FastifyInstanceGenericInterface
> = OverrideTypeProvider<Optional, OverrideLogger<Optional, OverrideGetReply<Optional, OverrideRequest<Optional, OverrideServer<Optional, Default>>>>>
export type OverrideRouteGeneric<
  Optional extends FastifyInstanceRouteGenericInterface,
  Default extends FastifyInstanceRouteGenericInterface
> = OverrideRouteSchema<Optional, OverrideRouteReply<Optional, OverrideRouteContext<Optional, OverrideRoute<Optional, OverrideInstanceGeneric<Optional, Default>>>>>
