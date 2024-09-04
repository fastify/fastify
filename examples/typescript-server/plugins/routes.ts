import { FastifyInstance } from '../../../fastify'
import { pingRoutes } from '../routes/ping'

export const registerRoutes = (server: FastifyInstance) => {
  pingRoutes(server)
}
