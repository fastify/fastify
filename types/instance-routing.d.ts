import { ConstraintStrategy, FindResult } from 'find-my-way'
import { RouteGenericInterface, RouteOptions, RouteShorthandMethod } from './route'
import { FindMyWayVersion } from './router-options'
import { FastifySchema } from './schema'
import { FastifyTypeContext, RawReplyOf, RawRequestOf } from './type-context'
import { ContextConfigDefault, HTTPMethods, RawServerBase } from './utils'

export interface PrintRoutesOptions {
  method?: HTTPMethods
  includeMeta?: boolean | (string | symbol)[]
  commonPrefix?: boolean
  includeHooks?: boolean
}

/** Result returned by Fastify's configured find-my-way router. */
export type FindMyWayFindResult<RawServer extends RawServerBase> =
  FindResult<FindMyWayVersion<RawServer>>

/** Routing members parameterized by one normalized Fastify type context. */
export interface FastifyInstanceRouting<Context extends FastifyTypeContext, Instance> {
  addConstraintStrategy(
    strategy: ConstraintStrategy<FindMyWayVersion<Context['RawServer']>, unknown>
  ): void
  hasConstraintStrategy(strategyName: string): boolean
  routing(req: RawRequestOf<Context>, res: RawReplyOf<Context>): void

  route<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    const SchemaCompiler extends FastifySchema = FastifySchema
  >(opts: RouteOptions<
    Context['RawServer'],
    RawRequestOf<Context>,
    RawReplyOf<Context>,
    RouteGeneric,
    ContextConfig,
    SchemaCompiler,
    Context['TypeProvider'],
    Context['Logger']
  >): Instance
  delete: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>,
    Context['TypeProvider'], Context['Logger']>
  get: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>, Context['TypeProvider'],
    Context['Logger']>
  head: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>, Context['TypeProvider'],
    Context['Logger']>
  patch: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>, Context['TypeProvider'],
    Context['Logger']>
  post: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>, Context['TypeProvider'],
    Context['Logger']>
  put: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>, Context['TypeProvider'],
    Context['Logger']>
  options: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>,
    Context['TypeProvider'], Context['Logger']>
  propfind: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>,
    Context['TypeProvider'], Context['Logger']>
  proppatch: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>,
    Context['TypeProvider'], Context['Logger']>
  mkcalendar: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>,
    Context['TypeProvider'], Context['Logger']>
  mkcol: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>, Context['TypeProvider'],
    Context['Logger']>
  copy: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>, Context['TypeProvider'],
    Context['Logger']>
  move: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>, Context['TypeProvider'],
    Context['Logger']>
  lock: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>, Context['TypeProvider'],
    Context['Logger']>
  unlock: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>,
    Context['TypeProvider'], Context['Logger']>
  trace: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>, Context['TypeProvider'],
    Context['Logger']>
  report: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>,
    Context['TypeProvider'], Context['Logger']>
  search: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>,
    Context['TypeProvider'], Context['Logger']>
  query: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>, Context['TypeProvider'],
    Context['Logger']>
  all: RouteShorthandMethod<Context['RawServer'], RawRequestOf<Context>, RawReplyOf<Context>, Context['TypeProvider'],
    Context['Logger']>
  hasRoute<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema
  >(opts: Pick<RouteOptions<
    Context['RawServer'],
    RawRequestOf<Context>,
    RawReplyOf<Context>,
    RouteGeneric,
    ContextConfig,
    SchemaCompiler,
    Context['TypeProvider']
  >, 'method' | 'url' | 'constraints'>): boolean
  findRoute<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema
  >(opts: Pick<RouteOptions<
    Context['RawServer'],
    RawRequestOf<Context>,
    RawReplyOf<Context>,
    RouteGeneric,
    ContextConfig,
    SchemaCompiler,
    Context['TypeProvider']
  >, 'method' | 'url' | 'constraints'>): Omit<
    FindMyWayFindResult<Context['RawServer']>,
    'store'
  >
  supportedMethods: string[]
  addHttpMethod(method: string, methodOptions?: { hasBody: boolean }): Instance
  printRoutes(opts?: PrintRoutesOptions): string
}
