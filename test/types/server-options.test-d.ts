import fastify, { FastifyInstance, FastifyServerOptions } from '../../fastify'
import { expectType, expectError, expectAssignable } from 'tsd'
import { FastifyLoggerInstance } from '../../types/logger'
import { RawServerDefault } from '../../types/utils'

expectAssignable<FastifyInstance>(
  fastify({
    ajv: {
      customOptions: {
        allErrors: false
      }
    },
    schemaController: {
      compilersFactory: {
        buildValidator: (externalSchemas, options) => () => () => options?.customOptions?.allErrors ?? true
      }
    }
  })
)

expectAssignable<FastifyInstance>(
  fastify({
    ajv: {
      random: true
    },
    schemaController: {
      compilersFactory: {
        buildValidator: (externalSchemas, options) => () => (): boolean => options?.random ?? true
      }
    }
  })
)

expectError<FastifyServerOptions>(
  {
    ajv: {
      random: true
    },
    schemaController: {
      compilersFactory: {
        buildValidator: (externalSchemas, options) => () => (): boolean => options?.random ?? true
      }
    }
  }
)
