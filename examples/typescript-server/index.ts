import { createServer } from './app'

const PORT = 3000

const startServer = async () => {
  const server = createServer()

  try {
    const address = await server.listen({ port: PORT })
    console.log(`Server listening at ${address}`)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

startServer()
