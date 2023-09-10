'use strict'

const http = require('node:http')
const stream = require('node:stream')
const os = require('node:os')
const fs = require('node:fs')

const t = require('tap')
const split = require('split2')
const pino = require('pino')
const path = require('node:path')
const { streamSym } = require('pino/lib/symbols')

const Fastify = require('../../fastify')
const helper = require('../helper')
const { once, on } = stream

function createDeferredPromise () {
  const promise = {}
  promise.promise = new Promise(function (resolve) {
    promise.resolve = resolve
  })
  return promise
}

let count = 0
function createTempFile () {
  const file = path.join(os.tmpdir(), `sonic-boom-${process.pid}-${process.hrtime().toString()}-${count++}`)
  function cleanup () {
    try {
      fs.unlinkSync(file)
    } catch { }
  }
  return { file, cleanup }
}

function request (url, cleanup = () => { }) {
  const promise = createDeferredPromise()
  http.get(url, (res) => {
    const chunks = []
    // we consume the response
    res.on('data', function (chunk) {
      chunks.push(chunk)
    })
    res.once('end', function () {
      cleanup(res, Buffer.concat(chunks).toString())
      promise.resolve()
    })
  })
  return promise.promise
}

t.test('test log stream', (t) => {
  t.setTimeout(60000)

  let localhost
  let localhostForURL

  t.plan(24)

  t.before(async function () {
    [localhost, localhostForURL] = await helper.getLoopbackHost()
  })

  t.test('Should use serializers from plugin and route', async (t) => {
    const lines = [
      { msg: 'incoming request' },
      { test: 'XHello', test2: 'ZHello' },
      { msg: 'request completed' }
    ]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'info' }, stream)
    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.register(context1, {
      logSerializers: { test: value => 'X' + value }
    })

    function context1 (instance, opts, done) {
      instance.get('/', {
        logSerializers: {
          test2: value => 'Z' + value
        }
      }, (req, reply) => {
        req.log.info({ test: 'Hello', test2: 'Hello' }) // { test: 'XHello', test2: 'ZHello' }
        reply.send({ hello: 'world' })
      })
      done()
    }

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should use serializers from instance fastify and route', async (t) => {
    const lines = [
      { msg: 'incoming request' },
      { test: 'XHello', test2: 'ZHello' },
      { msg: 'request completed' }
    ]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)

    const logger = pino({
      level: 'info',
      serializers: {
        test: value => 'X' + value,
        test2: value => 'This should be override - ' + value
      }
    }, stream)
    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/', {
      logSerializers: {
        test2: value => 'Z' + value
      }
    }, (req, reply) => {
      req.log.info({ test: 'Hello', test2: 'Hello' }) // { test: 'XHello', test2: 'ZHello' }
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should use serializers inherit from contexts', async (t) => {
    const lines = [
      { msg: 'incoming request' },
      { test: 'XHello', test2: 'YHello', test3: 'ZHello' },
      { msg: 'request completed' }
    ]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)

    const logger = pino({
      level: 'info',
      serializers: {
        test: value => 'X' + value
      }
    }, stream)

    const fastify = Fastify({ logger })
    t.teardown(fastify.close.bind(fastify))

    fastify.register(context1, { logSerializers: { test2: value => 'Y' + value } })

    function context1 (instance, opts, done) {
      instance.get('/', {
        logSerializers: {
          test3: value => 'Z' + value
        }
      }, (req, reply) => {
        req.log.info({ test: 'Hello', test2: 'Hello', test3: 'Hello' }) // { test: 'XHello', test2: 'YHello', test3: 'ZHello' }
        reply.send({ hello: 'world' })
      })
      done()
    }

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should increase the log level for a specific plugin', async (t) => {
    const lines = ['Hello']
    t.plan(lines.length * 2 + 1)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'info' }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.register(function (instance, opts, done) {
      instance.get('/', (req, reply) => {
        req.log.error('Hello') // we should see this log
        reply.send({ hello: 'world' })
      })
      done()
    }, { logLevel: 'error' })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.level, 50)
      t.equal(line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should set the log level for the customized 404 handler', async (t) => {
    const lines = ['Hello']
    t.plan(lines.length * 2 + 1)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'warn' }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.register(function (instance, opts, done) {
      instance.setNotFoundHandler(function (req, reply) {
        req.log.error('Hello')
        reply.code(404).send()
      })
      done()
    }, { logLevel: 'error' })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      t.equal(response.statusCode, 404)
    }

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.level, 50)
      t.equal(line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should set the log level for the customized 500 handler', async (t) => {
    const lines = ['Hello']
    t.plan(lines.length * 2 + 1)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'warn' }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.register(function (instance, opts, done) {
      instance.get('/', (req, reply) => {
        req.log.error('kaboom')
        reply.send(new Error('kaboom'))
      })

      instance.setErrorHandler(function (e, request, reply) {
        reply.log.fatal('Hello')
        reply.code(500).send()
      })
      done()
    }, { logLevel: 'fatal' })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      t.equal(response.statusCode, 500)
    }

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.level, 60)
      t.equal(line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should set a custom log level for a specific route', async (t) => {
    const lines = ['incoming request', 'Hello', 'request completed']
    t.plan(lines.length + 2)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'error' }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/log', { logLevel: 'info' }, (req, reply) => {
      req.log.info('Hello')
      reply.send({ hello: 'world' })
    })

    fastify.get('/no-log', (req, reply) => {
      req.log.info('Hello')
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/log' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    {
      const response = await fastify.inject({ method: 'GET', url: '/no-log' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('The default 404 handler logs the incoming request', async (t) => {
    const lines = ['incoming request', 'Route GET:/not-found not found', 'request completed']
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'trace' }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/not-found' })
      t.equal(response.statusCode, 404)
    }

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('should serialize request and response', async (t) => {
    const lines = [
      { req: { method: 'GET', url: '/500' }, msg: 'incoming request' },
      { req: { method: 'GET', url: '/500' }, msg: '500 error' },
      { msg: 'request completed' }
    ]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)
    const fastify = Fastify({ logger: { level: 'info', stream } })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/500', (req, reply) => {
      reply.code(500).send(Error('500 error'))
    })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/500' })
      t.equal(response.statusCode, 500)
    }

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Wrap IPv6 address in listening log message', async (t) => {
    t.plan(1)

    const interfaces = os.networkInterfaces()
    const ipv6 = Object.keys(interfaces)
      .filter(name => name.substr(0, 2) === 'lo')
      .map(name => interfaces[name])
      .reduce((list, set) => list.concat(set), [])
      .filter(info => info.family === 'IPv6')
      .map(info => info.address)
      .shift()

    if (ipv6 === undefined) {
      t.pass('No IPv6 loopback interface')
    } else {
      const stream = split(JSON.parse)
      const fastify = Fastify({
        logger: {
          stream,
          level: 'info'
        }
      })
      t.teardown(fastify.close.bind(fastify))

      await fastify.ready()
      await fastify.listen({ port: 0, host: ipv6 })

      {
        const [line] = await once(stream, 'data')
        t.same(line.msg, `Server listening at http://[${ipv6}]:${fastify.server.address().port}`)
      }
    }
  })

  t.test('Do not wrap IPv4 address', async (t) => {
    t.plan(1)
    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream,
        level: 'info'
      }
    })
    t.teardown(fastify.close.bind(fastify))

    await fastify.ready()
    await fastify.listen({ port: 0, host: '127.0.0.1' })

    {
      const [line] = await once(stream, 'data')
      t.same(line.msg, `Server listening at http://127.0.0.1:${fastify.server.address().port}`)
    }
  })

  t.test('file option', async (t) => {
    const lines = [
      { msg: /Server listening at/ },
      { reqId: /req-/, req: { method: 'GET', url: '/' }, msg: 'incoming request' },
      { reqId: /req-/, res: { statusCode: 200 }, msg: 'request completed' }
    ]
    t.plan(lines.length + 3)
    const { file, cleanup } = createTempFile(t)

    const fastify = Fastify({
      logger: { file }
    })
    t.teardown(() => {
      // cleanup the file after sonic-boom closed
      // otherwise we may face racing condition
      fastify.log[streamSym].once('close', cleanup)
      // we must flush the stream ourself
      // otherwise buffer may whole sonic-boom
      fastify.log[streamSym].flushSync()
      // end after flushing to actually close file
      fastify.log[streamSym].end()
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/', function (req, reply) {
      t.ok(req.log)
      reply.send({ hello: 'world' })
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port)

    // we already own the full log
    const stream = fs.createReadStream(file).pipe(split(JSON.parse))
    t.teardown(stream.resume.bind(stream))

    let id
    for await (const [line] of on(stream, 'data')) {
      if (id === undefined && line.reqId) id = line.reqId
      if (id !== undefined && line.reqId) t.equal(line.reqId, id)
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('should log the error if no error handler is defined', async (t) => {
    const lines = [
      { msg: /Server listening at/ },
      { msg: 'incoming request' },
      { level: 50, msg: 'a generic error' },
      { res: { statusCode: 500 }, msg: 'request completed' }
    ]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream,
        level: 'info'
      }
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/error', function (req, reply) {
      t.ok(req.log)
      reply.send(new Error('a generic error'))
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port + '/error')

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('should log as info if error status code >= 400 and < 500 if no error handler is defined', async (t) => {
    const lines = [
      { msg: /Server listening at/ },
      { msg: 'incoming request' },
      { level: 30, msg: 'a 400 error' },
      { res: { statusCode: 400 }, msg: 'request completed' }
    ]
    t.plan(lines.length + 1)
    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream,
        level: 'info'
      }
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/400', function (req, reply) {
      t.ok(req.log)
      reply.send(Object.assign(new Error('a 400 error'), { statusCode: 400 }))
    })
    fastify.get('/503', function (req, reply) {
      t.ok(req.log)
      reply.send(Object.assign(new Error('a 503 error'), { statusCode: 503 }))
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port + '/400')

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('should log as error if error status code >= 500 if no error handler is defined', async (t) => {
    const lines = [
      { msg: /Server listening at/ },
      { msg: 'incoming request' },
      { level: 50, msg: 'a 503 error' },
      { res: { statusCode: 503 }, msg: 'request completed' }
    ]
    t.plan(lines.length + 1)
    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream,
        level: 'info'
      }
    })
    t.teardown(fastify.close.bind(fastify))
    fastify.get('/503', function (req, reply) {
      t.ok(req.log)
      reply.send(Object.assign(new Error('a 503 error'), { statusCode: 503 }))
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port + '/503')

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('should not log the error if error handler is defined and it does not error', async (t) => {
    const lines = [
      { msg: /Server listening at/ },
      { level: 30, msg: 'incoming request' },
      { res: { statusCode: 200 }, msg: 'request completed' }
    ]
    t.plan(lines.length + 2)
    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream,
        level: 'info'
      }
    })
    t.teardown(fastify.close.bind(fastify))
    fastify.get('/error', function (req, reply) {
      t.ok(req.log)
      reply.send(new Error('something happened'))
    })
    fastify.setErrorHandler((err, req, reply) => {
      t.ok(err)
      reply.send('something bad happened')
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port + '/error')

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('should not rely on raw request to log errors', async (t) => {
    const lines = [
      { msg: /Server listening at/ },
      { level: 30, msg: 'incoming request' },
      { res: { statusCode: 415 }, msg: 'something happened' },
      { res: { statusCode: 415 }, msg: 'request completed' }
    ]
    t.plan(lines.length + 1)
    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream,
        level: 'info'
      }
    })
    t.teardown(fastify.close.bind(fastify))
    fastify.get('/error', function (req, reply) {
      t.ok(req.log)
      reply.status(415).send(new Error('something happened'))
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port + '/error')

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('should redact the authorization header if so specified', async (t) => {
    const lines = [
      { msg: /Server listening at/ },
      { req: { headers: { authorization: '[Redacted]' } }, msg: 'incoming request' },
      { res: { statusCode: 200 }, msg: 'request completed' }
    ]
    t.plan(lines.length + 3)
    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream,
        redact: ['req.headers.authorization'],
        level: 'info',
        serializers: {
          req (req) {
            return {
              method: req.method,
              url: req.url,
              headers: req.headers,
              hostname: req.hostname,
              remoteAddress: req.ip,
              remotePort: req.socket.remotePort
            }
          }
        }
      }
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/', function (req, reply) {
      t.same(req.headers.authorization, 'Bearer abcde')
      reply.send({ hello: 'world' })
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request({
      method: 'GET',
      path: '/',
      host: localhost,
      port: fastify.server.address().port,
      headers: {
        authorization: 'Bearer abcde'
      }
    }, function (response, body) {
      t.equal(response.statusCode, 200)
      t.same(body, JSON.stringify({ hello: 'world' }))
    })

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('should not log incoming request and outgoing response when disabled', async (t) => {
    t.plan(3)
    const stream = split(JSON.parse)
    const fastify = Fastify({ disableRequestLogging: true, logger: { level: 'info', stream } })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/500', (req, reply) => {
      reply.code(500).send(Error('500 error'))
    })

    await fastify.ready()

    await fastify.inject({ method: 'GET', url: '/500' })

    {
      const [line] = await once(stream, 'data')
      t.ok(line.reqId, 'reqId is defined')
      t.equal(line.msg, '500 error', 'message is set')
    }

    // no more readable data
    t.equal(stream.readableLength, 0)
  })

  t.test('should not log incoming request and outgoing response for 404 onBadUrl when disabled', async (t) => {
    t.plan(3)
    const stream = split(JSON.parse)
    const fastify = Fastify({ disableRequestLogging: true, logger: { level: 'info', stream } })
    t.teardown(fastify.close.bind(fastify))

    await fastify.ready()

    await fastify.inject({ method: 'GET', url: '/%c0' })

    {
      const [line] = await once(stream, 'data')
      t.ok(line.reqId, 'reqId is defined')
      t.equal(line.msg, 'Route GET:/%c0 not found', 'message is set')
    }

    // no more readable data
    t.equal(stream.readableLength, 0)
  })

  t.test('should pass when using unWritable props in the logger option', (t) => {
    t.plan(8)
    const fastify = Fastify({
      logger: Object.defineProperty({}, 'level', { value: 'info' })
    })
    t.teardown(fastify.close.bind(fastify))

    t.equal(typeof fastify.log, 'object')
    t.equal(typeof fastify.log.fatal, 'function')
    t.equal(typeof fastify.log.error, 'function')
    t.equal(typeof fastify.log.warn, 'function')
    t.equal(typeof fastify.log.info, 'function')
    t.equal(typeof fastify.log.debug, 'function')
    t.equal(typeof fastify.log.trace, 'function')
    t.equal(typeof fastify.log.child, 'function')
  })

  t.test('should be able to use a custom logger', (t) => {
    t.plan(7)

    const logger = {
      fatal: (msg) => { t.equal(msg, 'fatal') },
      error: (msg) => { t.equal(msg, 'error') },
      warn: (msg) => { t.equal(msg, 'warn') },
      info: (msg) => { t.equal(msg, 'info') },
      debug: (msg) => { t.equal(msg, 'debug') },
      trace: (msg) => { t.equal(msg, 'trace') },
      child: () => logger
    }

    const fastify = Fastify({ logger })
    t.teardown(fastify.close.bind(fastify))

    fastify.log.fatal('fatal')
    fastify.log.error('error')
    fastify.log.warn('warn')
    fastify.log.info('info')
    fastify.log.debug('debug')
    fastify.log.trace('trace')
    const child = fastify.log.child()
    t.equal(child, logger)
  })

  t.test('should create a default logger if provided one is invalid', (t) => {
    t.plan(8)

    const logger = new Date()

    const fastify = Fastify({ logger })
    t.teardown(fastify.close.bind(fastify))

    t.equal(typeof fastify.log, 'object')
    t.equal(typeof fastify.log.fatal, 'function')
    t.equal(typeof fastify.log.error, 'function')
    t.equal(typeof fastify.log.warn, 'function')
    t.equal(typeof fastify.log.info, 'function')
    t.equal(typeof fastify.log.debug, 'function')
    t.equal(typeof fastify.log.trace, 'function')
    t.equal(typeof fastify.log.child, 'function')
  })

  t.test('should not throw error when serializing custom req', (t) => {
    t.plan(1)

    const lines = []
    const dest = new stream.Writable({
      write: function (chunk, enc, cb) {
        lines.push(JSON.parse(chunk))
        cb()
      }
    })
    const fastify = Fastify({ logger: { level: 'info', stream: dest } })
    t.teardown(fastify.close.bind(fastify))

    fastify.log.info({ req: {} })

    t.same(lines[0].req, {})
  })
})
