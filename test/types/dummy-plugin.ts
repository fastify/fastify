import { FastifyPlugin } from '../../fastify'

export interface DummyPluginOptions {
  foo?: number
}

declare const DummyPlugin: FastifyPlugin<DummyPluginOptions>

export default DummyPlugin
