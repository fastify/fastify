'use strict'

const { test, before } = require('tap')
const Fastify = require('../..')
const helper = require('../helper')
const http = require('node:http')
const pino = require('pino')
const split = require('split2')
const deepClone = require('rfdc')({ circles: true, proto: false })
const { deepFreezeObject } = require('../../lib/initialConfigValidation').utils

const { buildCertificate } = require('../build-certificate')

process.removeAllListeners('warning')

let localhost
let localhostForURL

before(async function () {
  await buildCertificate();
  [localhost, localhostForURL] = await helper.getLoopbackHost()
})

test('Fastify.initialConfig is an object', t => {
  t.plan(1)
  t.type(Fastify().initialConfig, 'object')
})

test('without options passed to Fastify, initialConfig should expose default values', t => {
  t.plan(1)

  const fastifyDefaultOptions = {
    connectionTimeout: 0,
    keepAliveTimeout: 72000,
    maxRequestsPerSocket: 0,
    requestTimeout: 0,
    bodyLimit: 1024 * 1024,
    caseSensitive: true,
    allowUnsafeRegex: false,
    disableRequestLogging: false,
    jsonShorthand: true,
    ignoreTrailingSlash: false,
    ignoreDuplicateSlashes: false,
    maxParamLength: 100,
    onProtoPoisoning: 'error',
    onConstructorPoisoning: 'error',
    pluginTimeout: 10000,
    requestIdHeader: 'request-id',
    requestIdLogLabel: 'reqId',
    http2SessionTimeout: 72000,
    exposeHeadRoutes: true
  }

  t.same(Fastify().initialConfig, fastifyDefaultOptions)
})

test('Fastify.initialConfig should expose all options', t => {
  t.plan(21)

  const serverFactory = (handler, opts) => {
    const server = http.createServer((req, res) => {
      handler(req, res)
    })

    return server
  }

  const versionStrategy = {
    name: 'version',
    storage: function () {
      const versions = {}
      return {
        get: (version) => { return versions[version] || null },
        set: (version, store) => { versions[version] = store }
      }
    },
    deriveConstraint: (req, ctx) => {
      return req.headers.accept
    },
    validate () { return true }
  }

  let reqId = 0
  const options = {
    http2: true,
    https: {
      key: global.context.key,
      cert: global.context.cert
    },
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    maxParamLength: 200,
    connectionTimeout: 0,
    keepAliveTimeout: 72000,
    bodyLimit: 1049600,
    onProtoPoisoning: 'remove',
    serverFactory,
    caseSensitive: true,
    allowUnsafeRegex: false,
    requestIdHeader: 'request-id-alt',
    pluginTimeout: 20000,
    querystringParser: str => str,
    genReqId: function (req) {
      return reqId++
    },
    logger: pino({ level: 'info' }),
    constraints: {
      version: versionStrategy
    },
    trustProxy: function myTrustFn (address, hop) {
      return address === '1.2.3.4' || hop === 1
    }
  }

  const fastify = Fastify(options)
  t.equal(fastify.initialConfig.http2, true)
  t.equal(fastify.initialConfig.https, true, 'for security reason the key cert is hidden')
  t.equal(fastify.initialConfig.ignoreTrailingSlash, true)
  t.equal(fastify.initialConfig.ignoreDuplicateSlashes, true)
  t.equal(fastify.initialConfig.maxParamLength, 200)
  t.equal(fastify.initialConfig.connectionTimeout, 0)
  t.equal(fastify.initialConfig.keepAliveTimeout, 72000)
  t.equal(fastify.initialConfig.bodyLimit, 1049600)
  t.equal(fastify.initialConfig.onProtoPoisoning, 'remove')
  t.equal(fastify.initialConfig.caseSensitive, true)
  t.equal(fastify.initialConfig.allowUnsafeRegex, false)
  t.equal(fastify.initialConfig.requestIdHeader, 'request-id-alt')
  t.equal(fastify.initialConfig.pluginTimeout, 20000)
  t.ok(fastify.initialConfig.constraints.version)

  // obfuscated options:
  t.equal(fastify.initialConfig.serverFactory, undefined)
  t.equal(fastify.initialConfig.trustProxy, undefined)
  t.equal(fastify.initialConfig.genReqId, undefined)
  t.equal(fastify.initialConfig.childLoggerFactory, undefined)
  t.equal(fastify.initialConfig.querystringParser, undefined)
  t.equal(fastify.initialConfig.logger, undefined)
  t.equal(fastify.initialConfig.trustProxy, undefined)
})

test('Should throw if you try to modify Fastify.initialConfig', t => {
  t.plan(4)

  const fastify = Fastify({ ignoreTrailingSlash: true })
  try {
    fastify.initialConfig.ignoreTrailingSlash = false
    t.fail()
  } catch (error) {
    t.type(error, TypeError)
    t.equal(error.message, "Cannot assign to read only property 'ignoreTrailingSlash' of object '#<Object>'")
    t.ok(error.stack)
    t.pass()
  }
})

test('We must avoid shallow freezing and ensure that the whole object is freezed', t => {
  t.plan(4)

  const fastify = Fastify({
    https: {
      allowHTTP1: true,
      key: global.context.key,
      cert: global.context.cert
    }
  })

  try {
    fastify.initialConfig.https.allowHTTP1 = false
    t.fail()
  } catch (error) {
    t.type(error, TypeError)
    t.equal(error.message, "Cannot assign to read only property 'allowHTTP1' of object '#<Object>'")
    t.ok(error.stack)
    t.same(fastify.initialConfig.https, {
      allowHTTP1: true
    }, 'key cert removed')
  }
})

test('https value check', t => {
  t.plan(1)

  const fastify = Fastify({})
  t.notOk(fastify.initialConfig.https)
})

test('Return an error if options do not match the validation schema', t => {
  t.plan(6)

  try {
    Fastify({ ignoreTrailingSlash: 'string instead of boolean' })

    t.fail()
  } catch (error) {
    t.type(error, Error)
    t.equal(error.name, 'FastifyError')
    t.equal(error.message, 'Invalid initialization options: \'["must be boolean"]\'')
    t.equal(error.code, 'FST_ERR_INIT_OPTS_INVALID')
    t.ok(error.stack)
    t.pass()
  }
})

test('Original options must not be frozen', t => {
  t.plan(4)

  const originalOptions = {
    https: {
      allowHTTP1: true,
      key: global.context.key,
      cert: global.context.cert
    }
  }

  const fastify = Fastify(originalOptions)

  t.equal(Object.isFrozen(originalOptions), false)
  t.equal(Object.isFrozen(originalOptions.https), false)
  t.equal(Object.isFrozen(fastify.initialConfig), true)
  t.equal(Object.isFrozen(fastify.initialConfig.https), true)
})

test('Original options must not be altered (test deep cloning)', t => {
  t.plan(3)

  const originalOptions = {
    https: {
      allowHTTP1: true,
      key: global.context.key,
      cert: global.context.cert
    }
  }

  const originalOptionsClone = deepClone(originalOptions)

  const fastify = Fastify(originalOptions)

  // initialConfig has been triggered
  t.equal(Object.isFrozen(fastify.initialConfig), true)

  // originalOptions must not have been altered
  t.same(originalOptions.https.key, originalOptionsClone.https.key)
  t.same(originalOptions.https.cert, originalOptionsClone.https.cert)
})

test('Should not have issues when passing stream options to Pino.js', t => {
  t.plan(17)

  const stream = split(JSON.parse)

  const originalOptions = {
    ignoreTrailingSlash: true,
    logger: {
      level: 'trace',
      stream
    }
  }

  let fastify

  try {
    fastify = Fastify(originalOptions)
    fastify.setChildLoggerFactory(function (logger, bindings, opts) {
      bindings.someBinding = 'value'
      return logger.child(bindings, opts)
    })

    t.type(fastify, 'object')
    t.same(fastify.initialConfig, {
      connectionTimeout: 0,
      keepAliveTimeout: 72000,
      maxRequestsPerSocket: 0,
      requestTimeout: 0,
      bodyLimit: 1024 * 1024,
      caseSensitive: true,
      allowUnsafeRegex: false,
      disableRequestLogging: false,
      jsonShorthand: true,
      ignoreTrailingSlash: true,
      ignoreDuplicateSlashes: false,
      maxParamLength: 100,
      onProtoPoisoning: 'error',
      onConstructorPoisoning: 'error',
      pluginTimeout: 10000,
      requestIdHeader: 'request-id',
      requestIdLogLabel: 'reqId',
      http2SessionTimeout: 72000,
      exposeHeadRoutes: true
    })
  } catch (error) {
    t.fail()
  }

  fastify.get('/', function (req, reply) {
    t.ok(req.log)
    reply.send({ hello: 'world' })
  })

  stream.once('data', listenAtLogLine => {
    t.ok(listenAtLogLine, 'listen at log message is ok')

    stream.once('data', line => {
      const id = line.reqId
      t.ok(line.reqId, 'reqId is defined')
      t.equal(line.someBinding, 'value', 'child logger binding is set')
      t.ok(line.req, 'req is defined')
      t.equal(line.msg, 'incoming request', 'message is set')
      t.equal(line.req.method, 'GET', 'method is get')

      stream.once('data', line => {
        t.equal(line.reqId, id)
        t.ok(line.reqId, 'reqId is defined')
        t.equal(line.someBinding, 'value', 'child logger binding is set')
        t.ok(line.res, 'res is defined')
        t.equal(line.msg, 'request completed', 'message is set')
        t.equal(line.res.statusCode, 200, 'statusCode is 200')
        t.ok(line.responseTime, 'responseTime is defined')
      })
    })
  })

  fastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    http.get(`http://${localhostForURL}:${fastify.server.address().port}`)
  })
})

test('deepFreezeObject() should not throw on TypedArray', t => {
  t.plan(5)

  const object = {
    buffer: Buffer.from(global.context.key),
    dataView: new DataView(new ArrayBuffer(16)),
    float: 1.1,
    integer: 1,
    object: {
      nested: { string: 'string' }
    },
    stream: split(JSON.parse),
    string: 'string'
  }

  try {
    const frozenObject = deepFreezeObject(object)

    // Buffers should not be frozen, as they are Uint8Array inherited instances
    t.equal(Object.isFrozen(frozenObject.buffer), false)

    t.equal(Object.isFrozen(frozenObject), true)
    t.equal(Object.isFrozen(frozenObject.object), true)
    t.equal(Object.isFrozen(frozenObject.object.nested), true)

    t.pass()
  } catch (error) {
    t.fail()
  }
})

test('Fastify.initialConfig should accept the deprecated versioning option', t => {
  t.plan(1)

  function onWarning (warning) {
    t.equal(warning.code, 'FSTDEP009')
  }

  process.on('warning', onWarning)

  const versioning = {
    storage: function () {
      const versions = {}
      return {
        get: (version) => { return versions[version] || null },
        set: (version, store) => { versions[version] = store }
      }
    },
    deriveVersion: (req, ctx) => {
      return req.headers.accept
    }
  }

  Fastify({ versioning })
  setImmediate(function () {
    process.removeListener('warning', onWarning)
    t.end()
  })
})

test('pluginTimeout should be parsed correctly', t => {
  const withDisabledTimeout = Fastify({ pluginTimeout: '0' })
  t.equal(withDisabledTimeout.initialConfig.pluginTimeout, 0)
  const withInvalidTimeout = Fastify({ pluginTimeout: undefined })
  t.equal(withInvalidTimeout.initialConfig.pluginTimeout, 10000)
  t.end()
})
