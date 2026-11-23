// Type checked, never run, inside a downstream CommonJS TypeScript project.
import fastify = require('fastify')

const app: fastify.FastifyInstance = fastify()
fastify.fastify({ logger: true })
fastify.default()
app.get('/', async (request) => request.url)

// @ts-expect-error not an instance method
app.notAMethod()

export = app
