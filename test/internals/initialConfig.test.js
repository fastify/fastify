'use strict'

const { test } = require('tap')
const Fastify = require('../..')
const fs = require('fs')
const path = require('path')
const http = require('http')
const pino = require('pino')

test('Fastify.initialConfig is an object', t => {
  t.plan(1)
  t.type(Fastify().initialConfig, 'object')
})

test('without options passed to Fastify initialConfig is an empty object', t => {
  t.plan(1)
  t.deepEquals(Fastify().initialConfig, {})
})

test('Fastify.initialConfig should expose all options', t => {
  t.plan(17)

  const serverFactory = (handler, opts) => {
    const server = http.createServer((req, res) => {
      handler(req, res)
    })

    return server
  }

  const versioning = {
    storage: function () {
      let versions = {}
      return {
        get: (version) => { return versions[version] || null },
        set: (version, store) => { versions[version] = store },
        del: (version) => { delete versions[version] },
        empty: () => { versions = {} }
      }
    },
    deriveVersion: (req, ctx) => {
      return req.headers['accept']
    }
  }

  let options = {
    http2: true,
    https: {
      key: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.key')),
      cert: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.cert'))
    },
    ignoreTrailingSlash: true,
    maxParamLength: 200,
    bodyLimit: 1049600,
    onProtoPoisoning: 'remove',
    logger: true,
    serverFactory,
    caseSensitive: true,
    requestIdHeader: 'request-id-alt',
    trustProxy: '127.0.0.1,192.168.1.1/24',
    pluginTimeout: 20000
  }

  const app = Fastify(options)
  t.strictEqual(app.initialConfig.http2, true)
  t.strictEqual(app.initialConfig.https, true)
  t.strictEqual(app.initialConfig.ignoreTrailingSlash, true)
  t.strictEqual(app.initialConfig.maxParamLength, 200)
  t.strictEqual(app.initialConfig.bodyLimit, 1049600)
  t.strictEqual(app.initialConfig.onProtoPoisoning, 'remove')
  t.deepEqual(app.initialConfig.logger, { level: 'info' })
  t.strictEqual(app.initialConfig.serverFactory, true)
  t.strictEqual(app.initialConfig.caseSensitive, true)
  t.strictEqual(app.initialConfig.requestIdHeader, 'request-id-alt')
  t.strictEqual(app.initialConfig.trustProxy, '127.0.0.1,192.168.1.1/24')
  t.strictEqual(app.initialConfig.pluginTimeout, 20000)

  let customOptions = {
    querystringParser: str => str,
    genReqId: function (req) {
      let i = 0
      return i++
    },
    logger: pino({ level: 'info' }),
    versioning,
    trustProxy: function myTrustFn (address, hop) {
      return address === '1.2.3.4' || hop === 1
    }
  }

  const fatify = Fastify(customOptions)

  // obfuscated options:
  t.strictEqual(fatify.initialConfig.genReqId, 'custom')
  t.strictEqual(fatify.initialConfig.querystringParser, 'custom')
  t.strictEqual(fatify.initialConfig.logger, 'custom')
  t.strictEqual(fatify.initialConfig.versioning, 'custom')
  t.strictEqual(fatify.initialConfig.trustProxy, 'custom')
})

test('Should throw if you try to modify Fastify.initialConfig', t => {
  t.plan(1)

  const fastify = Fastify({ logger: true })
  try {
    fastify.initialConfig.logger = false
    t.fail()
  } catch (error) {
    t.pass()
  }
})

test('We must avoid shallow freezing and ensure that the whole object is freezed', t => {
  t.plan(1)

  const fastify = Fastify({ logger: true })
  try {
    fastify.initialConfig.logger.level = 'error'
    t.fail()
  } catch (error) {
    t.pass()
  }
})
