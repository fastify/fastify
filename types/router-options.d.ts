import * as http from 'node:http'
import { Config as FindMyWayConfig, HTTPVersion } from 'find-my-way'
import {
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase
} from './utils'

export type FindMyWayVersion<RawServer extends RawServerBase> =
  RawServer extends http.Server ? HTTPVersion.V1 : HTTPVersion.V2

type FindMyWayConfigForServer<RawServer extends RawServerBase> =
  FindMyWayConfig<FindMyWayVersion<RawServer>>

export type FastifyRouterOptions<RawServer extends RawServerBase> = Omit<
  FindMyWayConfigForServer<RawServer>,
  'defaultRoute' | 'onBadUrl' | 'onMaxParamLength' | 'querystringParser'
> & {
  defaultRoute?: (
    req: RawRequestDefaultExpression<RawServer>,
    res: RawReplyDefaultExpression<RawServer>
  ) => void
  onBadUrl?: (
    path: string,
    req: RawRequestDefaultExpression<RawServer>,
    res: RawReplyDefaultExpression<RawServer>
  ) => void
  onMaxParamLength?: (
    path: string,
    req: RawRequestDefaultExpression<RawServer>,
    res: RawReplyDefaultExpression<RawServer>
  ) => void
  querystringParser?: (str: string) => { [key: string]: unknown }
}
