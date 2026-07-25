import { FindResult } from 'find-my-way'
import { FindMyWayVersion } from './router-options'
import { HTTPMethods, RawServerBase } from './utils'

export interface PrintRoutesOptions {
  method?: HTTPMethods
  includeMeta?: boolean | (string | symbol)[]
  commonPrefix?: boolean
  includeHooks?: boolean
}

/** Result returned by Fastify's configured find-my-way router. */
export type FindMyWayFindResult<RawServer extends RawServerBase> =
  FindResult<FindMyWayVersion<RawServer>>
