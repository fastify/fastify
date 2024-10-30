import { FastifyPlugin, FastifyPluginAsync, FastifyPluginCallback } from '../../types/plugin'
import { ApplyDependencies, FastifyDependencies, UnEncapsulatedPlugin } from '../../types/register'

export function createPlugin<
  TPlugin extends FastifyPluginCallback,
  TDependencies extends FastifyDependencies,
  TEnhanced extends ApplyDependencies<TPlugin, TDependencies> = ApplyDependencies<TPlugin, TDependencies>
> (plugin: TEnhanced, options?: { dependencies?: TDependencies }): UnEncapsulatedPlugin<TEnhanced>
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
