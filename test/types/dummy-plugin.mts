import { FastifyPluginAsync } from '../../fastify.js'

export interface DummyPluginOptions {
  foo?: number
}

declare const DummyPlugin: FastifyPluginAsync<DummyPluginOptions>

export default DummyPlugin
