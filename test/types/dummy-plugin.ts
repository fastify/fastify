import type { FastifyPlugin } from '../../fastify.js'

export interface DummyPluginOptions {
  foo?: number
}

declare const DummyPlugin: FastifyPlugin<DummyPluginOptions>

export default DummyPlugin
