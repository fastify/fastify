import { expectAssignable, expectError, expectType } from 'tsd'
import fastify, { FastifyInstance, FastifyPluginAsync } from '../../fastify'

const testPluginOptsAsync: FastifyPluginAsync = async function (_instance, _opts) { }

// Type validation
expectError(fastify().register(testPluginOptsAsync, { prefix: 1 }))
expectError(fastify().register(testPluginOptsAsync, { logLevel: () => ({}) }))
expectError(fastify().register(testPluginOptsAsync, { logSerializers: () => ({}) }))
expectError(fastify().register({}))

expectAssignable<FastifyInstance>(
  fastify().register(
    testPluginOptsAsync, { prefix: '/example', logLevel: 'info', logSerializers: { key: (value: any) => `${value}` } }
  )
)

expectAssignable<FastifyInstance>(
  fastify().register(testPluginOptsAsync, () => {
    return {}
  })
)

expectAssignable<FastifyInstance>(
  fastify().register(testPluginOptsAsync, (instance) => {
    expectType<FastifyInstance>(instance)
  })
)
