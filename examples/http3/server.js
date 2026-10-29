'use strict'

const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const Fastify = require('../..')
const { createNodeServerFactory } = require('@currentspace/http3/node')

async function buildApp ({ key, cert, staticRoot, logger = true }) {
  const tls = { key, cert }
  const app = Fastify({
    logger,
    https: tls,
    serverFactory: createNodeServerFactory({
      ...tls,
      runtimeMode: 'portable',
      allowHTTP1: true,
      shutdownTimeoutMs: 30_000
    })
  })

  app.get('/api/protocol', request => ({
    httpVersion: request.raw.httpVersion,
    protocol: request.protocol,
    ip: request.ip
  }))

  if (staticRoot) {
    await app.register(require('@fastify/static'), { root: resolve(staticRoot) })
    app.setNotFoundHandler((request, reply) => {
      const isNavigation = ['GET', 'HEAD'].includes(request.method) &&
        request.headers.accept?.includes('text/html') && !request.url.startsWith('/api/')
      if (isNavigation) return reply.sendFile('index.html')
      return reply.code(404).send({ error: 'Not found' })
    })
  }

  return app
}

async function main () {
  if (!process.env.TLS_KEY_FILE || !process.env.TLS_CERT_FILE) {
    throw new Error('Set TLS_KEY_FILE and TLS_CERT_FILE to PEM file paths')
  }
  const app = await buildApp({
    key: readFileSync(process.env.TLS_KEY_FILE),
    cert: readFileSync(process.env.TLS_CERT_FILE),
    staticRoot: process.env.STATIC_ROOT
  })
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      app.close().catch(error => { app.log.error(error); process.exitCode = 1 })
    })
  }
  await app.listen({ port: Number(process.env.PORT || 8443), host: process.env.HOST || '127.0.0.1' })
}

if (require.main === module) {
  main().catch(error => { console.error(error); process.exitCode = 1 })
}

module.exports = { buildApp }
