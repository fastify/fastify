'use strict'

const { test } = require('tap')
const proxyquire = require('proxyquire')

const Fastify = require('../../fastify')
const { createServer } = require('../../lib/server')

const handler = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ data: 'Hello World!' }))
}

test('start listening', async t => {
  const { server, listen } = createServer({}, handler)
  await listen.call(Fastify(), { port: 0, host: 'localhost' })
  server.close()
  t.pass('server started')
})

test('DNS errors does not stop the main server on localhost - promise interface', async t => {
  const { createServer } = proxyquire('../../lib/server', {
    dns: {
      lookup: (hostname, options, cb) => {
        cb(new Error('DNS error'))
      }
    }
  })
  const { server, listen } = createServer({}, handler)
  await listen.call(Fastify(), { port: 0, host: 'localhost' })
  server.close()
  t.pass('server started')
})

test('DNS errors does not stop the main server on localhost - callback interface', t => {
  t.plan(2)
  const { createServer } = proxyquire('../../lib/server', {
    dns: {
      lookup: (hostname, options, cb) => {
        cb(new Error('DNS error'))
      }
    }
  })
  const { server, listen } = createServer({}, handler)
  listen.call(Fastify(), { port: 0, host: 'localhost' }, (err) => {
    t.error(err)
    server.close()
    t.pass('server started')
  })
})

test('DNS returns empty binding', t => {
  t.plan(2)
  const { createServer } = proxyquire('../../lib/server', {
    dns: {
      lookup: (hostname, options, cb) => {
        cb(null, [])
      }
    }
  })
  const { server, listen } = createServer({}, handler)
  listen.call(Fastify(), { port: 0, host: 'localhost' }, (err) => {
    t.error(err)
    server.close()
    t.pass('server started')
  })
})

test('DNS returns more than two binding', t => {
  t.plan(2)
  const { createServer } = proxyquire('../../lib/server', {
    dns: {
      lookup: (hostname, options, cb) => {
        cb(null, [
          { address: '::1', family: 6 },
          { address: '127.0.0.1', family: 4 },
          { address: '0.0.0.0', family: 4 }
        ])
      }
    }
  })
  const { server, listen } = createServer({}, handler)
  listen.call(Fastify(), { port: 0, host: 'localhost' }, (err) => {
    t.error(err)
    server.close()
    t.pass('server started')
  })
})
