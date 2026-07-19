import * as http from 'node:http'
import { expect } from 'tstyche'
import { FastifyBaseLogger, FastifyTypeProvider } from '../../fastify.js'
import {
  FastifyTypeContextOf,
  RawReplyOf,
  RawRequestOf
} from '../../types/type-context.js'

interface CustomRawRequest extends http.IncomingMessage {
  customRequest: true
}

interface CustomRawReply extends http.ServerResponse {
  customReply: true
}

interface CustomLogger extends FastifyBaseLogger {
  customLog(message: string): void
}

interface CustomProvider extends FastifyTypeProvider {
  validator: this['schema']
  serializer: this['schema']
}

type CustomContext = FastifyTypeContextOf<
  http.Server,
  CustomRawRequest,
  CustomRawReply,
  CustomLogger,
  CustomProvider
>

expect<CustomContext['RawServer']>().type.toBe<http.Server>()
expect<RawRequestOf<CustomContext>>().type.toBe<CustomRawRequest>()
expect<RawReplyOf<CustomContext>>().type.toBe<CustomRawReply>()
expect<CustomContext['Logger']>().type.toBe<CustomLogger>()
expect<CustomContext['TypeProvider']>().type.toBe<CustomProvider>()
