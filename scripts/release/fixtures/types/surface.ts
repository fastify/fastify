import fastify, {
  FastifyError,
  FastifyReply,
  FastifyRequest,
  FastifyTypeProvider,
  InjectOptions,
  LightMyRequestResponse,
  RouteGenericInterface
} from 'fastify'

interface Route extends RouteGenericInterface {
  Params: { id: string }
  Reply: { id: string }
}

const app = fastify()

app.get<Route>('/:id', async (request: FastifyRequest<Route>, reply: FastifyReply<Route>) => {
  const id: string = request.params.id
  // @ts-expect-error -- fails if the public types degrade to `any`
  request.params.id.toFixed()
  return { id }
})

app.setErrorHandler((error: FastifyError, request, reply) => reply.send(error))

const options: InjectOptions = { url: '/1' }
export const response: Promise<LightMyRequestResponse> = app.inject(options)

// @ts-expect-error -- unknown server options must be rejected
fastify({ bodyLimit: 'large' })

interface Provider extends FastifyTypeProvider { validator: string, serializer: string }
app.withTypeProvider<Provider>().get('/typed', async () => 'ok')
