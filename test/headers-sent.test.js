const spawn = require('child_process').spawn
const path = require('path')
const tap = require('tap')

const code = `
const Fastify = require('./')
const fastify = Fastify()
const sget = require('simple-get')
const stream = require('stream')

fastify.get('/', (req, reply) => {
  const endlessStream = new stream.Readable()
  reply.send(endlessStream)
})

fastify.listen(0, err => {
  fastify.server.unref()

  const req = sget(\`http://localhost:\${fastify.server.address().port}\`, (err, response) => {
    req.abort()
  })
})
`
tap.test('disconnecting from a stream response should not crash the server', t => {
  t.plan(1)

  const server = spawn('node', ['-e', code], {
    cwd: path.resolve()
  })

  server.stderr.on('data', err => {
    t.fail(err.toString())
  })

  server.on('close', code => {
    t.equal(code, 0, 'non-zero exit code')
  })
})
