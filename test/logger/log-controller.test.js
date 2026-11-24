'use strict'

const { test } = require('node:test')
const { Writable, Readable } = require('node:stream')
const { connect } = require('node:net')
const { once } = require('node:events')
const proxyquire = require('proxyquire')
const Fastify = require('../../fastify')
const Reply = require('../../lib/reply')
const { LogController } = require('../../lib/log-controller')
const { kRouteContext, kLogController, kFourOhFour } = require('../../lib/symbols')

function withResolvers () {
  let resolve
  const promise = new Promise(_resolve => { resolve = _resolve })
  return { promise, resolve }
}

function silentLogger () {
  const logger = {
    level: 'trace',
    fatal () { },
    error () { },
    warn () { },
    info () { },
    debug () { },
    trace () { },
    child () { return logger }
  }
  return logger
}

test('onRequestAbortError is called when an onRequestAbort hook fails', async (t) => {
  t.plan(4)
  const hookError = new Error('KABOOM!')
  const { promise, resolve } = withResolvers()

  const fastify = Fastify({
    logController: new class extends LogController {
      onRequestAbortError (error, request, reply, metadata) {
        t.assert.strictEqual(error, hookError)
        t.assert.strictEqual(request.url, '/')
        t.assert.strictEqual(reply.request, request)
        t.assert.strictEqual(metadata, undefined)
        resolve()
      }
    }()
  })
  t.after(() => fastify.close())

  fastify.addHook('onRequestAbort', function (req, done) {
    done(hookError)
  })
  fastify.get('/', async () => {
    await promise
    return 'never'
  })

  await fastify.listen({ port: 0 })
  const socket = connect(fastify.server.address().port)
  socket.write('GET / HTTP/1.1\r\nHost: fastify.test\r\n\r\n')
  setTimeout(() => socket.destroy(), 100)
  await promise
})

test('replyAlreadySent is called when the reply is sent twice', async (t) => {
  t.plan(4)
  const fastify = Fastify({
    logController: new class extends LogController {
      replyAlreadySent (error, request, reply, metadata) {
        t.assert.strictEqual(error.code, 'FST_ERR_REP_ALREADY_SENT')
        t.assert.strictEqual(request.url, '/')
        t.assert.strictEqual(reply.request, request)
      }
    }()
  })

  fastify.get('/', (request, reply) => {
    reply.send('one')
    reply.send('two')
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.body, 'one')
})

test('headersAlreadySent is called when writeHead throws ERR_HTTP_HEADERS_SENT', t => {
  t.plan(4)

  const response = new Writable()
  Object.assign(response, {
    setHeader: () => { },
    hasHeader: () => false,
    getHeader: () => undefined,
    writeHead: () => {
      const err = new Error('kaboom')
      err.code = 'ERR_HTTP_HEADERS_SENT'
      throw err
    },
    write: () => { },
    headersSent: true
  })

  const request = {
    [kRouteContext]: {
      onSend: null,
      server: {
        [kLogController]: new class extends LogController {
          headersAlreadySent (error, req, reply, metadata) {
            t.assert.strictEqual(error.code, 'ERR_HTTP_HEADERS_SENT')
            t.assert.strictEqual(req, request)
            t.assert.strictEqual(reply.request, request)
          }
        }()
      }
    },
    raw: { url: '/hello', method: 'GET' }
  }
  const reply = new Reply(response, request, silentLogger())

  t.assert.throws(() => reply.send(''), { code: 'ERR_HTTP_HEADERS_SENT' })
})

test('replyThenRejection is called when reply.then has no reject callback', (t, done) => {
  t.plan(3)

  const response = new Writable()
  const streamError = new Error('kaboom')
  const request = {
    [kRouteContext]: {
      server: {
        [kLogController]: new class extends LogController {
          replyThenRejection (error, req, reply, metadata) {
            t.assert.strictEqual(error, streamError)
            t.assert.strictEqual(req, request)
            t.assert.strictEqual(reply.request, request)
            done()
          }
        }()
      }
    }
  }
  const reply = new Reply(response, request, silentLogger())

  reply.then(() => t.assert.fail('fulfilled called'))
  response.destroy(streamError)
})

test('streamHeadersAlreadySent is called for a node stream after writeHead', async (t) => {
  t.plan(3)
  const fastify = Fastify({
    logController: new class extends LogController {
      streamHeadersAlreadySent (request, reply, metadata) {
        t.assert.strictEqual(request.url, '/')
        t.assert.strictEqual(reply.request, request)
      }
    }()
  })

  fastify.get('/', (request, reply) => {
    reply.raw.writeHead(200, { 'content-type': 'text/plain' })
    reply.send(Readable.from(['hello']))
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.body, 'hello')
})

test('streamHeadersAlreadySent is called for a web stream after writeHead', async (t) => {
  t.plan(3)
  const fastify = Fastify({
    logController: new class extends LogController {
      streamHeadersAlreadySent (request, reply, metadata) {
        t.assert.strictEqual(request.url, '/')
        t.assert.strictEqual(reply.request, request)
      }
    }()
  })

  fastify.get('/', (request, reply) => {
    reply.raw.writeHead(200, { 'content-type': 'text/plain' })
    reply.send(new ReadableStream({
      start (controller) {
        controller.enqueue('hello')
        controller.close()
      }
    }))
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.body, 'hello')
})

test('streamPayloadNotClosable is called when the stream payload cannot be released', (t, done) => {
  t.plan(2)

  const reply = proxyquire('../../lib/reply', {
    'node:stream': {
      finished: (...args) => {
        if (args.length === 2) { args[1](new Error('test-error')) }
      }
    }
  })
  const ProxiedFastify = proxyquire('../..', {
    './lib/reply.js': reply
  })
  const ProxiedLogController = ProxiedFastify.LogController

  const fastify = ProxiedFastify({
    logController: new class extends ProxiedLogController {
      streamPayloadNotClosable (request, reply, metadata) {
        t.assert.strictEqual(request.url, '/')
        t.assert.strictEqual(reply.request, request)
        fastify.close()
        done()
      }
    }()
  })
  fastify.get('/', (request, reply) => {
    reply.send({ hello: 'world' })
  })
  fastify.addHook('onSend', (request, reply, payload, done) => {
    done(null, { pipe: () => { } })
  })

  fastify.inject('/')
})

test('trailerError is called when a trailer function fails', async (t) => {
  t.plan(5)
  const trailerFailure = new Error('trailer failed')
  const fastify = Fastify({
    logController: new class extends LogController {
      trailerError (error, request, reply, metadata) {
        t.assert.strictEqual(error, trailerFailure)
        t.assert.strictEqual(request.url, '/')
        t.assert.strictEqual(reply.request, request)
        t.assert.deepStrictEqual(metadata, { trailerName: 'etag' })
      }
    }()
  })

  fastify.get('/', (request, reply) => {
    reply.trailer('ETag', (reply, payload, done) => done(trailerFailure))
    reply.send('hello')
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.trailers.etag, undefined)
})

test('notFoundInNotFoundHandler is called when callNotFound is used in a 404 handler', async (t) => {
  t.plan(3)
  const fastify = Fastify({
    logController: new class extends LogController {
      notFoundInNotFoundHandler (request, reply, metadata) {
        t.assert.strictEqual(request.url, '/missing')
        t.assert.strictEqual(reply.request, request)
      }
    }()
  })

  fastify.setNotFoundHandler((request, reply) => {
    reply.callNotFound()
  })

  const res = await fastify.inject('/missing')
  t.assert.strictEqual(res.body, '404 Not Found')
})

test('fourOhFourFallback is called when the 404 router fallback is reached', async (t) => {
  t.plan(5)
  const fastify = Fastify({
    logController: new class extends LogController {
      fourOhFourFallback (request, reply, metadata) {
        t.assert.strictEqual(request.url, '/')
        t.assert.strictEqual(reply.request, request)
        t.assert.strictEqual(metadata.router, fastify[kFourOhFour].router)
        t.assert.strictEqual(typeof metadata.router.prettyPrint(), 'string')
      }
    }()
  })

  fastify.get('/', (request, reply) => {
    reply.hijack()
    fastify[kFourOhFour].router.defaultRoute(request.raw, reply.raw)
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 404)
})

test('promiseRejectedAfterSent is called when an async handler rejects after reply is sent', async (t) => {
  t.plan(4)
  const handlerError = new Error('kaboom')
  const { promise, resolve } = withResolvers()
  const fastify = Fastify({
    logController: new class extends LogController {
      promiseRejectedAfterSent (error, request, reply, metadata) {
        t.assert.strictEqual(error, handlerError)
        t.assert.strictEqual(request.url, '/')
        t.assert.strictEqual(reply.request, request)
        resolve()
      }
    }()
  })

  fastify.get('/', (request, reply) => {
    reply.hijack()
    reply.raw.end('hello world')
    return Promise.reject(handlerError)
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.body, 'hello world')
  await promise
})

test('headStreamError is called when a node stream errors in a HEAD route', async (t) => {
  t.plan(4)
  const streamError = new Error('Hello!')
  const { promise, resolve } = withResolvers()
  const fastify = Fastify({
    logController: new class extends LogController {
      headStreamError (error, request, reply, metadata) {
        t.assert.strictEqual(error, streamError)
        t.assert.strictEqual(request.method, 'HEAD')
        t.assert.strictEqual(reply.request, request)
        resolve()
      }
    }()
  })

  fastify.get('/', (request, reply) => {
    const stream = Readable.from('Hello with error!')
    process.nextTick(() => stream.emit('error', streamError))
    return stream
  })

  const res = await fastify.inject({ method: 'HEAD', url: '/' })
  t.assert.strictEqual(res.statusCode, 200)
  await promise
})

test('headStreamError is called when a web stream cancel fails in a HEAD route', async (t) => {
  t.plan(4)
  const cancelError = new Error('Cancel error!')
  const { promise, resolve } = withResolvers()
  const fastify = Fastify({
    logController: new class extends LogController {
      headStreamError (error, request, reply, metadata) {
        t.assert.strictEqual(error, cancelError)
        t.assert.strictEqual(request.method, 'HEAD')
        t.assert.strictEqual(reply.request, request)
        resolve()
      }
    }()
  })

  fastify.get('/', () => {
    return new ReadableStream({
      start (controller) { controller.enqueue('hello') },
      cancel () { throw cancelError }
    })
  })

  const res = await fastify.inject({ method: 'HEAD', url: '/' })
  t.assert.strictEqual(res.statusCode, 200)
  await promise
})

test('onListenHookError is called when an onListen hook fails', async (t) => {
  t.plan(4)
  const hookError = new Error('onListen failed')
  const loggerInstance = silentLogger()
  const { promise, resolve } = withResolvers()
  const fastify = Fastify({
    loggerInstance,
    logController: new class extends LogController {
      onListenHookError (logger, server, error) {
        t.assert.strictEqual(logger, loggerInstance)
        t.assert.strictEqual(server, fastify)
        t.assert.strictEqual(error, hookError)
        resolve()
      }
    }()
  })
  t.after(() => fastify.close())

  fastify.addHook('onListen', function (done) {
    done(hookError)
  })

  await fastify.listen({ port: 0 })
  await promise
  t.assert.ok(fastify.server.listening)
})

test('clientError is called by the default clientErrorHandler', async (t) => {
  t.plan(4)
  const loggerInstance = silentLogger()
  const { promise, resolve } = withResolvers()
  const fastify = Fastify({
    loggerInstance,
    logController: new class extends LogController {
      clientError (logger, server, error, label) {
        t.assert.strictEqual(logger, loggerInstance)
        t.assert.strictEqual(server, fastify)
        t.assert.ok(error instanceof Error)
        t.assert.strictEqual(label, 'error')
        resolve()
      }
    }()
  })
  t.after(() => fastify.close())

  await fastify.listen({ port: 0 })
  const socket = connect(fastify.server.address().port)
  t.after(() => socket.destroy())
  socket.write('GET / HTTP/1.1\r\nHost fastify.test\r\n\r\n')
  await promise
})

test('serverListening is called for each listening address', async (t) => {
  t.plan(5)
  const loggerInstance = silentLogger()
  const listenTextResolver = (address) => `custom ${address}`
  const fastify = Fastify({
    loggerInstance,
    logController: new class extends LogController {
      serverListening (logger, server, address, resolver) {
        t.assert.strictEqual(logger, loggerInstance)
        t.assert.strictEqual(server, fastify)
        t.assert.strictEqual(address, `http://127.0.0.1:${server.server.address().port}`)
        t.assert.strictEqual(resolver, listenTextResolver)
      }
    }()
  })
  t.after(() => fastify.close())

  const address = await fastify.listen({ port: 0, host: '127.0.0.1', listenTextResolver })
  t.assert.strictEqual(address, `http://127.0.0.1:${fastify.server.address().port}`)
})

test('a custom controller can adapt every internal log line to a non-pino logger', async (t) => {
  const calls = []
  const record = (level) => (...args) => { calls.push({ level, args }) }
  // winston-like logger: (message, meta)
  const loggerInstance = {
    level: 'trace',
    fatal: record('fatal'),
    error: record('error'),
    warn: record('warn'),
    info: record('info'),
    debug: record('debug'),
    trace: record('trace'),
    child () { return loggerInstance }
  }

  class WinstonLogController extends LogController {
    incomingRequest (request, reply) {
      request.log.info('incoming request', { req: request })
    }

    requestCompleted (error, request, reply) {
      if (error) {
        reply.log.error('request errored', { res: reply, err: error, responseTime: reply.elapsedTime })
      } else {
        reply.log.info('request completed', { res: reply, responseTime: reply.elapsedTime })
      }
    }

    defaultErrorLog (error, request, reply) {
      reply.log.error(error.message, { err: error })
    }

    streamError (error, request, reply) {
      reply.log.warn('response terminated with an error with headers already sent', { err: error })
    }

    routeNotFound (request, reply) {
      request.log.info(`Route ${request.method}:${request.url} not found`)
    }

    writeHeadError (error, request, reply) {
      reply.log.warn(error.message, { err: error })
    }

    serializerError (error, request, reply, metadata) {
      reply.log.error('The serializer for the given status code failed', { err: error, statusCode: metadata.statusCode })
    }

    serviceUnavailable (logger, server) {
      logger.info('request aborted - refusing to accept new requests as server is closing')
    }

    onRequestAbortError (error, request, reply) {
      reply.log.error('onRequestAborted hook failed', { err: error })
    }

    replyAlreadySent (error, request, reply) {
      reply.log.warn(error.message, { err: error })
    }

    headersAlreadySent (error, request, reply) {
      reply.log.warn('Reply was already sent', { err: error })
    }

    replyThenRejection (error, request, reply) {
      reply.log.warn('unhandled rejection on reply.then', { err: error })
    }

    streamHeadersAlreadySent (request, reply) {
      reply.log.warn('response will send, but you shouldn\'t use res.writeHead in stream mode')
    }

    streamPayloadNotClosable (request, reply) {
      reply.log.warn('stream payload does not end properly')
    }

    trailerError (error, request, reply, metadata) {
      reply.log.debug('trailer failed', { err: error, trailerName: metadata.trailerName })
    }

    notFoundInNotFoundHandler (request, reply) {
      reply.log.warn('Trying to send a NotFound error inside a 404 handler')
    }

    fourOhFourFallback (request, reply, metadata) {
      request.log.warn('the default handler for 404 did not catch this', { routes: metadata.router.prettyPrint() })
    }

    promiseRejectedAfterSent (error, request, reply) {
      reply.log.error('Promise errored, but reply.sent = true was set', { err: error })
    }

    headStreamError (error, request, reply) {
      reply.log.error('Error on Stream found for HEAD route', { err: error })
    }

    onListenHookError (logger, server, error) {
      logger.error('onListen hook failed', { err: error })
    }

    clientError (logger, server, error, label) {
      logger.trace(`client ${label}`, { err: error })
    }

    serverListening (logger, server, address, listenTextResolver) {
      logger.info(listenTextResolver(address), { address })
    }
  }

  const fastify = Fastify({ loggerInstance, logController: new WinstonLogController() })
  t.after(() => fastify.close())

  fastify.addHook('onListen', function (done) {
    done(new Error('onListen failed'))
  })
  fastify.get('/twice', (request, reply) => {
    reply.send('one')
    reply.send('two')
  })
  fastify.get('/error', async () => {
    throw new Error('boom')
  })
  fastify.get('/trailer', (request, reply) => {
    reply.trailer('ETag', (reply, payload, done) => done(new Error('trailer failed')))
    reply.send('hello')
  })
  fastify.get('/stream', (request, reply) => {
    reply.raw.writeHead(200)
    reply.send(Readable.from(['hello']))
  })
  fastify.get('/head-stream', () => {
    const stream = Readable.from('hello')
    process.nextTick(() => stream.emit('error', new Error('stream error')))
    return stream
  })
  fastify.get('/sent', (request, reply) => {
    reply.hijack()
    reply.raw.end('hello')
    return Promise.reject(new Error('after sent'))
  })
  fastify.get('/fallback', (request, reply) => {
    reply.hijack()
    fastify[kFourOhFour].router.defaultRoute(request.raw, reply.raw)
  })
  fastify.register(async (child) => {
    child.setNotFoundHandler((request, reply) => {
      reply.callNotFound()
    })
  }, { prefix: '/nested' })

  await fastify.listen({ port: 0, host: '127.0.0.1' })
  const base = `http://127.0.0.1:${fastify.server.address().port}`

  await fetch(`${base}/twice`)
  await fetch(`${base}/error`)
  await fetch(`${base}/not-found`)
  await fetch(`${base}/nested/missing`)
  await fetch(`${base}/trailer`)
  await fetch(`${base}/stream`)
  await fetch(`${base}/head-stream`, { method: 'HEAD' })
  await fetch(`${base}/sent`)
  await fetch(`${base}/fallback`)

  const socket = connect(fastify.server.address().port)
  socket.write('GET / HTTP/1.1\r\nHost fastify.test\r\n\r\n')
  await once(socket, 'data')
  socket.destroy()

  // let async log lines (HEAD stream error, rejected promise) settle
  await new Promise(resolve => setImmediate(resolve))

  const messages = calls.map(c => c.args[0])
  for (const expected of [
    'onListen hook failed',
    `Server listening at ${base}`,
    'incoming request',
    'request completed',
    'boom',
    'did you forget to "return reply" in "/twice" (GET)?',
    'Route GET:/not-found not found',
    'Trying to send a NotFound error inside a 404 handler',
    'trailer failed',
    'response will send, but you shouldn\'t use res.writeHead in stream mode',
    'Error on Stream found for HEAD route',
    'Promise errored, but reply.sent = true was set',
    'the default handler for 404 did not catch this',
    'client error'
  ]) {
    t.assert.ok(messages.some(m => typeof m === 'string' && m.includes(expected)), `missing log line: ${expected}`)
  }

  for (const { level, args } of calls) {
    t.assert.strictEqual(typeof args[0], 'string', `${level} called with (obj, msg): ${JSON.stringify(args[0])}`)
  }
})
