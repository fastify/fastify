import fastify = require('fastify')
import { fastify as named, errorCodes, FastifyInstance } from 'fastify'

const app: FastifyInstance = fastify()
const other: FastifyInstance = named({ logger: true })
errorCodes.FST_ERR_NOT_FOUND
app.get('/', async (request, reply) => reply.send({ id: request.id }))
other.close()
