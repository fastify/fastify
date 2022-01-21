import { FastifyInstanceGenericInterface } from './instance'
import { ReplyGenericInterface } from './reply'
import { RequestGenericInterface } from './request'

export interface RouteGenericInterface extends RequestGenericInterface, ReplyGenericInterface {}

export interface FastifyInstanceRouteGenericInterface extends FastifyInstanceGenericInterface {
  Route?: RouteGenericInterface
  Context?: unknown
  Schema?: unknown
}

export type DefaultRoute<Request, Reply> = (
  request: Request,
  reply: Reply,
) => void;
