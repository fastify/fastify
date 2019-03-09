'use strict'

const { test } = require('tap')
const Fastify = require('../..')
const fs = require('fs')
const path = require('path')
const http = require('http')
const pino = require('pino')
const split = require('split2')
const deepClone = require('rfdc')({ circles: true, proto: false })

test('Fastify.initialConfig is an object', t => {
  t.plan(1)
  t.type(Fastify().initialConfig, 'object')
})

test('without options passed to Fastify initialConfig is an empty object', t => {
  t.plan(1)
  t.deepEquals(Fastify().initialConfig, {})
})

test('Fastify.initialConfig should expose all options', t => {
  t.plan(16)

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
    serverFactory,
    caseSensitive: true,
    requestIdHeader: 'request-id-alt',
    pluginTimeout: 20000,
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

  const fastify = Fastify(options)
  t.strictEqual(fastify.initialConfig.http2, true)
  t.strictEqual(fastify.initialConfig.https, true)
  t.strictEqual(fastify.initialConfig.ignoreTrailingSlash, true)
  t.strictEqual(fastify.initialConfig.maxParamLength, 200)
  t.strictEqual(fastify.initialConfig.bodyLimit, 1049600)
  t.strictEqual(fastify.initialConfig.onProtoPoisoning, 'remove')
  t.strictEqual(fastify.initialConfig.caseSensitive, true)
  t.strictEqual(fastify.initialConfig.requestIdHeader, 'request-id-alt')
  t.strictEqual(fastify.initialConfig.pluginTimeout, 20000)

  // obfuscated options:
  t.strictEqual(fastify.initialConfig.serverFactory, undefined)
  t.strictEqual(fastify.initialConfig.trustProxy, undefined)
  t.strictEqual(fastify.initialConfig.genReqId, undefined)
  t.strictEqual(fastify.initialConfig.querystringParser, undefined)
  t.strictEqual(fastify.initialConfig.logger, undefined)
  t.strictEqual(fastify.initialConfig.versioning, undefined)
  t.strictEqual(fastify.initialConfig.trustProxy, undefined)
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
      key: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.key')),
      cert: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.cert'))
    }
  })

  try {
    fastify.initialConfig.https.allowHTTP1 = false
    t.fail()
  } catch (error) {
    t.type(error, TypeError)
    t.equal(error.message, "Cannot assign to read only property 'allowHTTP1' of object '#<Object>'")
    t.ok(error.stack)
    t.pass()
  }
})

test('Return an error if options do not match the validation schema', t => {
  t.plan(6)

  try {
    Fastify({ ignoreTrailingSlash: 'string instead of boolean' })

    t.fail()
  } catch (error) {
    t.type(error, Error)
    t.equal(error.name, 'FastifyError [FST_ERR_INIT_OPTS_INVALID]')
    t.equal(error.message, `FST_ERR_INIT_OPTS_INVALID: Invalid initialization options: 'should be boolean'`)
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
      key: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.key')),
      cert: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.cert'))
    }
  }

  const fastify = Fastify(originalOptions)

  t.strictEqual(Object.isFrozen(originalOptions), false)
  t.strictEqual(Object.isFrozen(originalOptions.https), false)
  t.strictEqual(Object.isFrozen(fastify.initialConfig), true)
  t.strictEqual(Object.isFrozen(fastify.initialConfig.https), true)
})

test('Original options must not be altered (test deep cloning)', t => {
  t.plan(3)

  const originalOptions = {
    https: {
      allowHTTP1: true,
      key: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.key')),
      cert: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.cert'))
    }
  }

  const originalOptionsClone = deepClone(originalOptions)

  const fastify = Fastify(originalOptions)

  // initialConfig has been triggered
  t.strictEqual(Object.isFrozen(fastify.initialConfig), true)

  // originalOptions must not have been altered
  t.deepEqual(originalOptions.https.key, originalOptionsClone.https.key)
  t.deepEqual(originalOptions.https.cert, originalOptionsClone.https.cert)
})

test('Should not have issues when passing stream options to Pino.js', t => {
  t.plan(15)

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

    t.type(fastify, 'object')
    t.deepEqual(fastify.initialConfig, { ignoreTrailingSlash: true })
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
      t.ok(line.req, 'req is defined')
      t.equal(line.msg, 'incoming request', 'message is set')
      t.equal(line.req.method, 'GET', 'method is get')

      stream.once('data', line => {
        t.equal(line.reqId, id)
        t.ok(line.reqId, 'reqId is defined')
        t.ok(line.res, 'res is defined')
        t.equal(line.msg, 'request completed', 'message is set')
        t.equal(line.res.statusCode, 200, 'statusCode is 200')
        t.ok(line.responseTime, 'responseTime is defined')
      })
    })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    http.get('http://localhost:' + fastify.server.address().port)
  })
})
