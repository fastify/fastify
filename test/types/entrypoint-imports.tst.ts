import { expect } from 'tstyche'
import defaultFastify, {
  fastify as namedFastify,
  FastifyChildLoggerFactory,
  FastifyError,
  FastifyInstance,
  FastifyServerOptions,
  SchemaErrorDataVar,
  SchemaErrorFormatter
} from '../../fastify.js'
import * as FastifyNamespace from '../../fastify.js'
import FastifyRequire = require('../../fastify.js')

expect(defaultFastify()).type.toBeAssignableTo<FastifyInstance>()
expect(namedFastify()).type.toBe<typeof defaultFastify extends (...args: never[]) => infer Result ? Result : never>()
expect(FastifyNamespace.fastify()).type.toBeAssignableTo<FastifyInstance>()
expect(FastifyRequire()).type.toBeAssignableTo<FastifyInstance>()

expect<FastifyNamespace.FastifyServerOptions>().type.toBe<FastifyServerOptions>()
expect<FastifyError['validationContext']>().type.toBe<
  'body' | 'headers' | 'params' | 'querystring' | undefined
>()
expect<SchemaErrorDataVar>().type.toBe<'body' | 'headers' | 'params' | 'querystring'>()
expect<SchemaErrorFormatter>().type.toBeAssignableTo<
  (...args: Parameters<SchemaErrorFormatter>) => Error
>()
expect<FastifyChildLoggerFactory>().type.toBeAssignableTo<(...args: never[]) => unknown>()
