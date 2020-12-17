import { expectAssignable, expectError } from 'tsd'
import fastify, { FastifyInstance } from '../../fastify'
import Ajv = require('ajv')

const server = fastify()

expectAssignable<FastifyInstance>(server.get(
  '/full-schema',
  {
    schema: {
      body: { type: 'null' },
      querystring: { type: 'null' },
      params: { type: 'null' },
      headers: { type: 'null' },
      response: { type: 'null' }
    }
  },
  () => { }
))

expectAssignable<FastifyInstance>(server.get(
  '/empty-schema',
  {
    schema: {}
  },
  () => { }
))

expectAssignable<FastifyInstance>(server.get(
  '/no-schema',
  {},
  () => { }
))

expectAssignable<FastifyInstance>(server.setValidatorCompiler(({ schema }) => {
  return new Ajv().compile(schema)
}))

expectAssignable<FastifyInstance>(server.setSerializerCompiler(() => {
  return data => JSON.stringify(data)
}))

expectError(server.get(
  '/unknown-schema-prop',
  {
    schema: {
      unknown: { type: 'null' }
    }
  },
  () => { }
))
