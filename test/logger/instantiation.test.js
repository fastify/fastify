'use strict'

const stream = require('node:stream')
const os = require('node:os')
const fs = require('node:fs')

const t = require('tap')
const split = require('split2')

const { streamSym } = require('pino/lib/symbols')

const Fastify = require('../../fastify')
const helper = require('../helper')
const { FST_ERR_LOG_INVALID_LOGGER } = require('../../lib/errors')
const { once, on } = stream
const { createTempFile, request } = require('./logger-test-utils')

t.test('logger instantiation', (t) => {
  t.setTimeout(60000)

  let localhost
  let localhostForURL

  t.plan(11)
  t.before(async function () {
    [localhost, localhostForURL] = await helper.getLoopbackHost()
  })

  t.test('can use external logger instance', async (t) => {
    const lines = [/^Server listening at /, /^incoming request$/, /^log success$/, /^request completed$/]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)

    const logger = require('pino')(stream)

    const fastify = Fastify({ logger })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/foo', function (req, reply) {
      t.ok(req.log)
      req.log.info('log success')
      reply.send({ hello: 'world' })
    })

    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port + '/foo')

    for await (const [line] of on(stream, 'data')) {
      const regex = lines.shift()
      t.ok(regex.test(line.msg), '"' + line.msg + '" dont match "' + regex + '"')
      if (lines.length === 0) break
    }
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

  t.test('expose the logger', async (t) => {
    t.plan(2)
    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream,
        level: 'info'
      }
    })
    t.teardown(fastify.close.bind(fastify))

    await fastify.ready()

    t.ok(fastify.log)
    t.same(typeof fastify.log, 'object')
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

    const { file, cleanup } = createTempFile(t)
    // 0600 permissions (read/write for owner only)
    if (process.env.CITGM) { fs.writeFileSync(file, '', { mode: 0o600 }) }

    const fastify = Fastify({
      logger: { file }
    })

    t.teardown(async () => {
      await helper.sleep(250)
      // may fail on win
      try {
        // cleanup the file after sonic-boom closed
        // otherwise we may face racing condition
        fastify.log[streamSym].once('close', cleanup)
        // we must flush the stream ourself
        // otherwise buffer may whole sonic-boom
        fastify.log[streamSym].flushSync()
        // end after flushing to actually close file
        fastify.log[streamSym].end()
      } catch (err) {
        console.warn(err)
      }
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/', function (req, reply) {
      t.ok(req.log)
      reply.send({ hello: 'world' })
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })
    await request(`http://${localhostForURL}:` + fastify.server.address().port)

    await helper.sleep(250)

    const log = fs.readFileSync(file, 'utf8').split('\n')
    // strip last line
    log.pop()

    let id
    for (let line of log) {
      line = JSON.parse(line)
      if (id === undefined && line.reqId) id = line.reqId
      if (id !== undefined && line.reqId) t.equal(line.reqId, id)
      t.match(line, lines.shift())
    }
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

  t.test('should throw in case a partially matching logger is provided', async (t) => {
    t.plan(1)

    try {
      const fastify = Fastify({ logger: console })
      await fastify.ready()
    } catch (err) {
      t.equal(
        err instanceof FST_ERR_LOG_INVALID_LOGGER,
        true,
        "Invalid logger object provided. The logger instance should have these functions(s): 'fatal,child'."
      )
    }
  })

  t.test('can use external logger instance with custom serializer', async (t) => {
    const lines = [['level', 30], ['req', { url: '/foo' }], ['level', 30], ['res', { statusCode: 200 }]]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)
    const logger = require('pino')({
      level: 'info',
      serializers: {
        req: function (req) {
          return {
            url: req.url
          }
        }
      }
    }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/foo', function (req, reply) {
      t.ok(req.log)
      req.log.info('log success')
      reply.send({ hello: 'world' })
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port + '/foo')

    for await (const [line] of on(stream, 'data')) {
      const check = lines.shift()
      const key = check[0]
      const value = check[1]
      t.same(line[key], value)
      if (lines.length === 0) break
    }
  })

  t.test('The logger should accept custom serializer', async (t) => {
    const lines = [
      { msg: /^Server listening at / },
      { req: { url: '/custom' }, msg: 'incoming request' },
      { res: { statusCode: 500 }, msg: 'kaboom' },
      { res: { statusCode: 500 }, msg: 'request completed' }
    ]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream,
        level: 'info',
        serializers: {
          req: function (req) {
            return {
              url: req.url
            }
          }
        }
      }
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/custom', function (req, reply) {
      t.ok(req.log)
      reply.send(new Error('kaboom'))
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port + '/custom')

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('should throw in case the external logger provided does not have a child method', async (t) => {
    t.plan(1)
    const loggerInstance = {
      info: console.info,
      error: console.error,
      debug: console.debug,
      fatal: console.error,
      warn: console.warn,
      trace: console.trace
    }

    try {
      const fastify = Fastify({ logger: loggerInstance })
      await fastify.ready()
    } catch (err) {
      t.equal(
        err instanceof FST_ERR_LOG_INVALID_LOGGER,
        true,
        "Invalid logger object provided. The logger instance should have these functions(s): 'child'."
      )
    }
  })
})
