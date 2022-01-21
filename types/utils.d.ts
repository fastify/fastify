import * as http from 'http'
import { FastifyInstanceGenericInterface } from './instance'
import { FastifyLoggerInstance } from './logger'

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

/**
 * The below getter is used to ensure the option to not
 * fall into unknown. It always fallback to the default.
 */
export type GetServer<Generic extends FastifyInstanceGenericInterface> = Generic['Server'] extends unknown | undefined ? FastifyInstanceServerDefault : Generic['Server']
export type GetRequest<Generic extends FastifyInstanceGenericInterface> = Generic['Request'] extends unknown | undefined ? FastifyInstanceRequestDefault : Generic['Request']
export type GetReply<Generic extends FastifyInstanceGenericInterface> = Generic['Reply'] extends unknown | undefined ? FastifyInstanceReplyDefault : Generic['Reply']
export type GetLogger<Generic extends FastifyInstanceGenericInterface> = Generic['Logger'] extends unknown | undefined ? FastifyInstanceLoggerDefault : Generic['Logger']
