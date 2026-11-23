// Type checked, never run, inside a downstream project.
// Each @ts-expect-error fails the check if the types degrade to `any`.
import Fastify, {
  fastify, errorCodes, LogController,
  FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest
} from 'fastify'

const app: FastifyInstance = Fastify({ logger: true })
fastify({ logController: new LogController() })

const plugin: FastifyPluginAsync<{ prefix: string }> = async (instance) => {
  instance.get<{ Querystring: { n: number } }>('/', async (request: FastifyRequest<{ Querystring: { n: number } }>, reply: FastifyReply) => {
    const n: number = request.query.n
    // @ts-expect-error the querystring type is number
    const wrong: string = request.query.n
    return reply.code(200).send({ n, wrong })
  })
}
app.register(plugin, { prefix: '/a' })

const listening: Promise<string> = app.listen({ port: 0 })
const status: Promise<number> = app.inject({ method: 'GET', url: '/' }).then((response) => response.statusCode)
app.log.info(new errorCodes.FST_ERR_VALIDATION('message').message)

// @ts-expect-error not a server option type
Fastify({ bodyLimit: 'large' })
// @ts-expect-error not an instance method
app.notAMethod()

export { listening, status }
