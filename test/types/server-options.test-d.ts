import fastify, { FastifyInstance } from '../../fastify'
import { expectError, expectAssignable } from 'tsd'

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

expectError<FastifyInstance>(
  fastify({
    ajv: {
      customOptions: {
        allErrors: false
      }
    },
    schemaController: {
      compilersFactory: {
        buildValidator: (externalSchemas, options) => () => (): boolean => options?.random ?? true
      }
    }
  })
)
