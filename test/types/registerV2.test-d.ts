import { expectError, expectType } from 'tsd'
import fastify, {
  FastifyInstance,
  FastifyPlugin,
  FastifyPluginAsync,
  FastifyPluginCallback
} from '../../fastify'
import { ApplyDependencies, FastifyDependencies, UnEncapsulatedPlugin } from '../../types/register'

export function createPlugin<
  TPlugin extends FastifyPluginCallback,
  TDependencies extends FastifyDependencies,
  TEnhanced extends ApplyDependencies<TPlugin, TDependencies> = ApplyDependencies<TPlugin, TDependencies>
> (plugin: TEnhanced, options?: { dependencies?: TDependencies }): UnEncapsulatedPlugin<TEnhanced>
export function createPlugin<
  TPlugin extends FastifyPluginAsync,
  TDependencies extends FastifyDependencies,
  TEnhanced extends ApplyDependencies<TPlugin, TDependencies> = ApplyDependencies<TPlugin, TDependencies>
> (plugin: TEnhanced, options?: { dependencies?: TDependencies }): UnEncapsulatedPlugin<TEnhanced>
export function createPlugin<
  TPlugin extends FastifyPlugin,
  TDependencies extends FastifyDependencies,
  TEnhanced extends ApplyDependencies<TPlugin, TDependencies> = ApplyDependencies<TPlugin, TDependencies>
> (plugin: TEnhanced, options?: { dependencies?: TDependencies }): UnEncapsulatedPlugin<TEnhanced> {
  return plugin as UnEncapsulatedPlugin<TEnhanced>
}

const plugin = createPlugin((instance) =>
  instance
    .decorate('testPropSync')
    .decorate('testValueSync', 'testValue')
    .decorate('testFnSync', () => 12345)
    .decorateRequest('testPropSync')
    .decorateRequest('testValueSync', 'testValue')
    .decorateRequest('testFnSync', () => 12345)
    .decorateReply('testPropSync')
    .decorateReply('testValueSync', 'testValue')
    .decorateReply('testFnSync', () => 12345))

const asyncPlugin = createPlugin(async (instance: FastifyInstance) =>
  instance
    .decorate('testPropAsync')
    .decorate('testValueAsync', 'testValue')
    .decorate('testFnAsync', () => 12345)
    .decorateRequest('testPropAsync')
    .decorateRequest('testValueAsync', 'testValue')
    .decorateRequest('testFnAsync', () => 12345)
    .decorateReply('testPropAsync')
    .decorateReply('testValueAsync', 'testValue')
    .decorateReply('testFnAsync', () => 12345)
)

const syncWithDecorators = fastify().register(plugin)

syncWithDecorators.get('/', (req, res) => {
  expectType<void>(req.testPropSync)
  expectType<string>(req.testValueSync)
  expectType<number>(req.testFnSync())

  expectType<void>(res.testPropSync)
  expectType<string>(res.testValueSync)
  expectType<number>(res.testFnSync())
})

expectType<void>(syncWithDecorators.testPropSync)
expectType<string>(syncWithDecorators.testValueSync)
expectType<number>(syncWithDecorators.testFnSync())

const asyncWithDecorators = fastify().register(asyncPlugin)

asyncWithDecorators.get('/', (req, res) => {
  expectType<void>(req.testPropAsync)
  expectType<string>(req.testValueAsync)
  expectType<number>(req.testFnAsync())

  expectType<void>(res.testPropAsync)
  expectType<string>(res.testValueAsync)
  expectType<number>(res.testFnAsync())
})

expectType<void>(asyncWithDecorators.testPropAsync)
expectType<string>(asyncWithDecorators.testValueAsync)
expectType<number>(asyncWithDecorators.testFnAsync())

const plugin1 = (instance: FastifyInstance) =>
  instance
    .decorate('testPropSync2')

const plugin2 = (instance: FastifyInstance) =>
  instance
    .decorate('testPropSync3')

const pluginComposition = fastify()
  .register(plugin)
  .register(plugin1)
  .register(plugin2)
  .register(createPlugin((instance) => instance.decorate('testPropSync4')))
  .register(createPlugin(async (instance) => instance.decorate('testPropSync5')))
  .register(instance => {
    instance.decorate('testPropSync6')
  })
  .register(async instance => {
    instance.decorate('testPropSync7')
  })
  .register(asyncPlugin)

pluginComposition.get('/', (req, res) => {
  expectType<void>(req.testPropSync)
  expectType<void>(req.testPropAsync)
  expectType<void>(req.testPropSync)
  expectType<void>(res.testPropAsync)
})

expectType<void>(pluginComposition.testPropSync)
expectError(pluginComposition.testPropSync2)
expectError(pluginComposition.testPropSync3)
expectType<void>(pluginComposition.testPropAsync)
expectType<void>(pluginComposition.testPropSync4)
expectType<void>(pluginComposition.testPropSync5)
expectError<void>(pluginComposition.testPropSync6)
expectError<void>(pluginComposition.testPropSync7)
