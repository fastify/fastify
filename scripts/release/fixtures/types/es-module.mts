import Fastify, { fastify, errorCodes, LogController, FastifyPluginAsync } from 'fastify'
import * as namespace from 'fastify'

const plugin: FastifyPluginAsync<{ prefix: string }> = async (instance, options) => {
  instance.get(options.prefix, async () => 'ok')
}

const app = Fastify({ logController: new LogController() })
app.register(plugin, { prefix: '/a' })
fastify().register(plugin, { prefix: '/b' })
namespace.fastify().close()
errorCodes.FST_ERR_NOT_FOUND
