'use strict'

const fp = require('fastify-plugin')

function fastifyTiming (fastify, opts, done) {
  const headerName = opts.headerName || 'X-Response-Time'

  fastify.addHook('onRequest', (request, reply, next) => {
    request.startTime = process.hrtime.bigint()
    next()
  })

  fastify.addHook('onSend', (request, reply, payload, next) => {
    const endTime = process.hrtime.bigint()
    const durationNs = endTime - request.startTime
    const durationMs = Number(durationNs) / 1e6
    reply.header(headerName, durationMs.toFixed(2))
    next()
  })

  done()
}

module.exports = fp(fastifyTiming, {
  fastify: '5.x',
  name: 'fastify-timing'
})
