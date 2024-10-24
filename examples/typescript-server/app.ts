import fastify from '../../fastify'
import { registerRoutes } from './plugins/routes'

const createServer = () => {
  const server = fastify()

  registerRoutes(server)

  return server
}

export { createServer }
