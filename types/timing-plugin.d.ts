import { FastifyPluginCallback } from './plugin'

export interface FastifyTimingPluginOptions {
  headerName?: string
}

declare const fastifyTiming: FastifyPluginCallback<FastifyTimingPluginOptions>

export default fastifyTiming
export { fastifyTiming }
