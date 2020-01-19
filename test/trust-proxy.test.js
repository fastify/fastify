'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')

const sgetForwardedRequest = (app, forHeader, path) => {
  sget({
    method: 'GET',
    headers: {
      'X-Forwarded-For': forHeader,
      'X-Forwarded-Host': 'example.com'
    },
    url: 'http://localhost:' + app.server.address().port + path
  }, () => {})
}

const testRequestValues = (t, req, options) => {
  if (options.ip) {
    t.ok(req.ip, 'ip is defined')
    t.equal(req.ip, options.ip, 'gets ip from x-forwarded-for')
  }
  if (options.hostname) {
    t.ok(req.hostname, 'hostname is defined')
    t.equal(req.hostname, options.hostname, 'gets hostname from x-forwarded-host')
  }
  if (options.ips) {
    t.deepEqual(req.ips, options.ips, 'gets ips from x-forwarded-for')
  }
}

test('trust proxy, not add properties to node req', (t) => {
  t.plan(8)
  const app = fastify({
    trustProxy: true
  })
  app.get('/trustproxy', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', hostname: 'example.com' })
    reply.code(200).send({ ip: req.ip, hostname: req.hostname })
  })

  app.get('/trustproxychain', function (req, reply) {
    testRequestValues(t, req, { ip: '2.2.2.2', ips: ['127.0.0.1', '1.1.1.1', '2.2.2.2'] })
    reply.code(200).send({ ip: req.ip, hostname: req.hostname })
  })

  t.tearDown(app.close.bind(app))

  app.listen(0, (err) => {
    app.server.unref()
    t.error(err)
    sgetForwardedRequest(app, '1.1.1.1', '/trustproxy')
    sgetForwardedRequest(app, '2.2.2.2, 1.1.1.1', '/trustproxychain')
  })
})

test('trust proxy chain', (t) => {
  t.plan(3)
  const app = fastify({
    trustProxy: ['127.0.0.1', '192.168.1.1']
  })

  app.get('/trustproxychain', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1' })
    reply.code(200).send({ ip: req.ip, hostname: req.hostname })
  })

  t.tearDown(app.close.bind(app))

  app.listen(0, (err) => {
    app.server.unref()
    t.error(err)
    sgetForwardedRequest(app, '192.168.1.1, 1.1.1.1', '/trustproxychain')
  })
})

test('trust proxy function', (t) => {
  t.plan(3)
  const app = fastify({
    trustProxy: (address) => address === '127.0.0.1'
  })
  app.get('/trustproxyfunc', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1' })
    reply.code(200).send({ ip: req.ip, hostname: req.hostname })
  })

  t.tearDown(app.close.bind(app))

  app.listen(0, (err) => {
    app.server.unref()
    t.error(err)
    sgetForwardedRequest(app, '1.1.1.1', '/trustproxyfunc')
  })
})

test('trust proxy number', (t) => {
  t.plan(4)
  const app = fastify({
    trustProxy: 1
  })
  app.get('/trustproxynumber', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', ips: ['127.0.0.1', '1.1.1.1'] })
    reply.code(200).send({ ip: req.ip, hostname: req.hostname })
  })

  t.tearDown(app.close.bind(app))

  app.listen(0, (err) => {
    app.server.unref()
    t.error(err)
    sgetForwardedRequest(app, '2.2.2.2, 1.1.1.1', '/trustproxynumber')
  })
})

test('trust proxy IP addresses', (t) => {
  t.plan(4)
  const app = fastify({
    trustProxy: '127.0.0.1, 2.2.2.2'
  })
  app.get('/trustproxyipaddrs', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', ips: ['127.0.0.1', '1.1.1.1'] })
    reply.code(200).send({ ip: req.ip, hostname: req.hostname })
  })

  t.tearDown(app.close.bind(app))

  app.listen(0, (err) => {
    app.server.unref()
    t.error(err)
    sgetForwardedRequest(app, '3.3.3.3, 2.2.2.2, 1.1.1.1', '/trustproxyipaddrs')
  })
})
