'use strict'

const { test, before } = require('node:test')
const sget = require('simple-get').concat
const fastify = require('..')
const helper = require('./helper')
const { waitForCb } = require('./toolkit')

const noop = () => {}

const sgetForwardedRequest = (app, forHeader, path, protoHeader, testCaseDone) => {
  const headers = {
    'X-Forwarded-For': forHeader,
    'X-Forwarded-Host': 'example.com'
  }
  if (protoHeader) {
    headers['X-Forwarded-Proto'] = protoHeader
  }
  sget({
    method: 'GET',
    headers,
    url: 'http://localhost:' + app.server.address().port + path
  }, testCaseDone || noop)
}

const testRequestValues = (t, req, options) => {
  if (options.ip) {
    t.assert.ok(req.ip, 'ip is defined')
    t.assert.strictEqual(req.ip, options.ip, 'gets ip from x-forwarded-for')
  }
  if (options.host) {
    t.assert.ok(req.host, 'host is defined')
    t.assert.strictEqual(req.host, options.host, 'gets host from x-forwarded-host')
    t.assert.ok(req.hostname)
    t.assert.strictEqual(req.hostname, options.host, 'gets hostname from x-forwarded-host')
  }
  if (options.ips) {
    t.assert.deepStrictEqual(req.ips, options.ips, 'gets ips from x-forwarded-for')
  }
  if (options.protocol) {
    t.assert.ok(req.protocol, 'protocol is defined')
    t.assert.strictEqual(req.protocol, options.protocol, 'gets protocol from x-forwarded-proto')
  }
  if (options.port) {
    t.assert.ok(req.port, 'port is defined')
    t.assert.strictEqual(req.port, options.port, 'port is taken from x-forwarded-for or host')
  }
}

let localhost
before(async function () {
  [localhost] = await helper.getLoopbackHost()
})

test('trust proxy, not add properties to node req', (t, done) => {
  t.plan(14)
  const app = fastify({
    trustProxy: true
  })
  t.after(() => app.close())

  app.get('/trustproxy', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', host: 'example.com', port: app.server.address().port })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  app.get('/trustproxychain', function (req, reply) {
    testRequestValues(t, req, { ip: '2.2.2.2', ips: [localhost, '1.1.1.1', '2.2.2.2'], port: app.server.address().port })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  app.listen({ port: 0 }, (err) => {
    t.assert.ifError(err)

    const completion = waitForCb({ steps: 2 })

    sgetForwardedRequest(app, '1.1.1.1', '/trustproxy', undefined, completion.stepIn)
    sgetForwardedRequest(app, '2.2.2.2, 1.1.1.1', '/trustproxychain', undefined, completion.stepIn)

    completion.patience.then(done)
  })
})

test('trust proxy chain', (t, done) => {
  t.plan(9)
  const app = fastify({
    trustProxy: [localhost, '192.168.1.1']
  })
  t.after(() => app.close())

  app.get('/trustproxychain', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', host: 'example.com', port: app.server.address().port })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  app.listen({ port: 0 }, (err) => {
    t.assert.ifError(err)
    sgetForwardedRequest(app, '192.168.1.1, 1.1.1.1', '/trustproxychain', undefined, done)
  })
})

test('trust proxy function', (t, done) => {
  t.plan(9)
  const app = fastify({
    trustProxy: (address) => address === localhost
  })
  t.after(() => app.close())

  app.get('/trustproxyfunc', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', host: 'example.com', port: app.server.address().port })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  app.listen({ port: 0 }, (err) => {
    t.assert.ifError(err)
    sgetForwardedRequest(app, '1.1.1.1', '/trustproxyfunc', undefined, done)
  })
})

test('trust proxy number', (t, done) => {
  t.plan(10)
  const app = fastify({
    trustProxy: 1
  })
  t.after(() => app.close())

  app.get('/trustproxynumber', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', ips: [localhost, '1.1.1.1'], host: 'example.com', port: app.server.address().port })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  app.listen({ port: 0 }, (err) => {
    t.assert.ifError(err)
    sgetForwardedRequest(app, '2.2.2.2, 1.1.1.1', '/trustproxynumber', undefined, done)
  })
})

test('trust proxy IP addresses', (t, done) => {
  t.plan(10)
  const app = fastify({
    trustProxy: `${localhost}, 2.2.2.2`
  })
  t.after(() => app.close())

  app.get('/trustproxyipaddrs', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', ips: [localhost, '1.1.1.1'], host: 'example.com', port: app.server.address().port })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  app.listen({ port: 0 }, (err) => {
    t.assert.ifError(err)
    sgetForwardedRequest(app, '3.3.3.3, 2.2.2.2, 1.1.1.1', '/trustproxyipaddrs', undefined, done)
  })
})

test('trust proxy protocol', (t, done) => {
  t.plan(31)
  const app = fastify({
    trustProxy: true
  })
  t.after(() => app.close())

  app.get('/trustproxyprotocol', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', protocol: 'lorem', host: 'example.com', port: app.server.address().port })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })
  app.get('/trustproxynoprotocol', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', protocol: 'http', host: 'example.com', port: app.server.address().port })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })
  app.get('/trustproxyprotocols', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', protocol: 'dolor', host: 'example.com', port: app.server.address().port })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  app.listen({ port: 0 }, (err) => {
    t.assert.ifError(err)

    const completion = waitForCb({ steps: 3 })
    sgetForwardedRequest(app, '1.1.1.1', '/trustproxyprotocol', 'lorem', completion.stepIn)
    sgetForwardedRequest(app, '1.1.1.1', '/trustproxynoprotocol', undefined, completion.stepIn)

    // Allow for sgetForwardedRequest requests above to finish
    setTimeout(() => sgetForwardedRequest(app, '1.1.1.1', '/trustproxyprotocols', 'ipsum, dolor', completion.stepIn))

    completion.patience.then(done)
  })
})
