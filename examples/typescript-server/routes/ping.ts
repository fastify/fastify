import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from '../../../fastify'

export const pingRoutes = async (server: FastifyInstance) => {
  server.get('/ping', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send('pong\n')
  })
}
