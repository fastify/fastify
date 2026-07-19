import { AddressInfo } from 'node:net'
import { FastifyTypeContext } from './type-context'
import { SafePromiseLike } from './type-provider'

/** Core instance members that preserve the current Fastify type state. */
export interface FastifyInstanceCore<
  Context extends FastifyTypeContext,
  Instance
> {
  server: Context['RawServer']
  pluginName: string
  prefix: string
  version: string
  log: Context['Logger']
  listeningOrigin: string
  addresses(): AddressInfo[]

  addSchema(schema: unknown): Instance
  getSchema(schemaId: string): unknown
  getSchemas(): Record<string, unknown>

  after(): Instance & SafePromiseLike<undefined>
  after(afterListener: (err: Error | null) => void): Instance

  close(): Promise<undefined>
  close(closeListener: () => void): undefined

  /** Alias for `close()`. */
  // @ts-ignore - type only available for @types/node >=17 or TypeScript >=5.2
  [Symbol.asyncDispose](): Promise<undefined>

  ready(): Instance & SafePromiseLike<undefined>
  ready(readyListener: (err: Error | null) => void | Promise<void>): Instance
}
