import fastify, { FastifyPlugin, FastifyPluginOptions } from '../../fastify'
import { expectType, expectError } from 'tsd'
import { FastifyInstance } from '../../types/instance'

// FastifyPlugin & FastifyRegister
const plugin: FastifyPlugin<{
  option1: string;
  option2: boolean;
}> = function (instance, opts, next) { }
expectType<void>(fastify().register(plugin, { option1: '', option2: true }))

expectType<void>(fastify().register(function (instace: FastifyInstance, opts: FastifyPluginOptions, next: () => void) {}))
expectType<void>(fastify().register(function (instace: FastifyInstance, opts: FastifyPluginOptions, next: () => void) {}, () => {}))
expectType<void>(fastify().register(function (instance: FastifyInstance, opts: FastifyPluginOptions, next: () => void) {}, { logLevel: 'info', prefix: 'foobar' }))
expectError(fastify().register(function (instance: FastifyInstance, opts: FastifyPluginOptions, next: () => void) {}, { logLevel: '' })) // must use a valid logLevel
