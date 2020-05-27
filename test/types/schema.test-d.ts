import { expectAssignable, expectError } from 'tsd'
import fastify, { FastifyInstance } from '../../fastify'

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

expectError(server.get(
  '/unknown-schema-prop',
  {
    schema: {
      unknown: { type: 'null' }
    }
  },
  () => { }
))
