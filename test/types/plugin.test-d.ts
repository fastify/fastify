import fastify, { FastifyPlugin } from '../../fastify'
import {expectType, expectError} from 'tsd'

// FastifyPlugin & FastifyRegister
const plugin: FastifyPlugin<{
  option1: string,
  option2: boolean
}> = function(instance, opts, next) { }
expectError(fastify().register(plugin, {}))
expectType<void>(fastify().register(plugin, { option1: '', option2: true }))