'use strict'

const t = require('tap')
const test = t.test
const proxyquire = require('proxyquire')
const sget = require('simple-get').concat
const fs = require('fs')
const resolve = require('path').resolve
const zlib = require('zlib')
const pump = require('pump')
const Fastify = require('..')
const errors = require('http-errors')
const JSONStream = require('JSONStream')
const send = require('send')
const Readable = require('stream').Readable
const split = require('split2')
const { kDisableRequestLogging, kReplySent } = require('../lib/symbols.js')

function getUrl (app) {
  const { address, port } = app.server.address()
  if (address === '::1') {
    return `http://[${address}]:${port}`
  } else {
    return `http://${address}:${port}`
  }
}

test('should respond with a stream', t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    const stream = fs.createReadStream(__filename, 'utf8')
    reply.code(200).send(stream)
  })

  fastify.get('/error', function (req, reply) {
    const stream = fs.createReadStream('not-existing-file', 'utf8')
    reply.code(200).send(stream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget(`http://localhost:${fastify.server.address().port}`, function (err, response, data) {
      t.error(err)
      t.equal(response.headers['content-type'], 'application/octet-stream')
      t.equal(response.statusCode, 200)

      fs.readFile(__filename, (err, expected) => {
        t.error(err)
        t.equal(expected.toString(), data.toString())
      })
    })

    sget(`http://localhost:${fastify.server.address().port}/error`, function (err, response) {
      t.error(err)
      t.equal(response.statusCode, 500)
    })
  })
})

test('should trigger the onSend hook', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(fs.createReadStream(__filename, 'utf8'))
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    t.ok(payload._readableState)
    reply.header('Content-Type', 'application/javascript')
    done()
  })

  fastify.inject({
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.headers['content-type'], 'application/javascript')
    t.equal(res.payload, fs.readFileSync(__filename, 'utf8'))
    fastify.close()
  })
})

test('should trigger the onSend hook only twice if pumping the stream fails, first with the stream, second with the serialized error', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(fs.createReadStream('not-existing-file', 'utf8'))
  })

  let counter = 0
  fastify.addHook('onSend', (req, reply, payload, done) => {
    if (counter === 0) {
      t.ok(payload._readableState)
    } else if (counter === 1) {
      const error = JSON.parse(payload)
      t.equal(error.statusCode, 500)
    }
    counter++
    done()
  })

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    sget(`http://localhost:${fastify.server.address().port}`, function (err, response) {
      t.error(err)
      t.equal(response.statusCode, 500)
    })
  })
})

test('onSend hook stream', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    const gzStream = zlib.createGzip()

    reply.header('Content-Encoding', 'gzip')
    pump(
      fs.createReadStream(resolve(process.cwd() + '/test/stream.test.js'), 'utf8'),
      gzStream,
      t.error
    )
    done(null, gzStream)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.headers['content-encoding'], 'gzip')
    const file = fs.readFileSync(resolve(process.cwd() + '/test/stream.test.js'), 'utf8')
    const payload = zlib.gunzipSync(res.rawPayload)
    t.equal(payload.toString('utf-8'), file)
    fastify.close()
  })
})

test('onSend hook stream should work even if payload is not a proper stream', t => {
  t.plan(1)

  const reply = proxyquire('../lib/reply', {
    stream: {
      finished: (...args) => {
        if (args.length === 2) { args[1](new Error('test-error')) }
      }
    }
  })
  const Fastify = proxyquire('..', {
    './lib/reply.js': reply
  })
  const spyLogger = {
    fatal: () => { },
    error: () => { },
    warn: (message) => {
      t.equal(message, 'stream payload does not end properly')
      fastify.close()
    },
    info: () => { },
    debug: () => { },
    trace: () => { },
    child: () => { return spyLogger }
  }

  const fastify = Fastify({ logger: spyLogger })
  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  fastify.addHook('onSend', (req, reply, payload, done) => {
    const fakeStream = { pipe: () => { } }
    done(null, fakeStream)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  })
})

test('onSend hook stream should work on payload with "close" ending function', t => {
  t.plan(1)

  const reply = proxyquire('../lib/reply', {
    stream: {
      finished: (...args) => {
        if (args.length === 2) { args[1](new Error('test-error')) }
      }
    }
  })
  const Fastify = proxyquire('..', {
    './lib/reply.js': reply
  })

  const fastify = Fastify({ logger: false })
  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  fastify.addHook('onSend', (req, reply, payload, done) => {
    const fakeStream = {
      pipe: () => { },
      close: (cb) => {
        cb()
        t.pass()
      }
    }
    done(null, fakeStream)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  })
})

test('Destroying streams prematurely', t => {
  t.plan(6)

  let fastify = null
  const logStream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: logStream,
        level: 'info'
      }
    })
  } catch (e) {
    t.fail()
  }
  const stream = require('stream')
  const http = require('http')

  // Test that "premature close" errors are logged with level warn
  logStream.on('data', line => {
    if (line.res) {
      t.equal(line.msg, 'stream closed prematurely')
      t.equal(line.level, 30)
    }
  })

  fastify.get('/', function (request, reply) {
    t.pass('Received request')

    let sent = false
    const reallyLongStream = new stream.Readable({
      read: function () {
        if (!sent) {
          this.push(Buffer.from('hello\n'))
        }
        sent = true
      }
    })

    reply.send(reallyLongStream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    const port = fastify.server.address().port

    http.get(`http://localhost:${port}`, function (response) {
      t.equal(response.statusCode, 200)
      response.on('readable', function () {
        response.destroy()
      })

      // Node bug? Node never emits 'close' here.
      response.on('aborted', function () {
        t.pass('Response closed')
      })
    })
  })
})

test('Destroying streams prematurely should call close method', t => {
  t.plan(7)

  let fastify = null
  const logStream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: logStream,
        level: 'info'
      }
    })
  } catch (e) {
    t.fail()
  }
  const stream = require('stream')
  const http = require('http')

  // Test that "premature close" errors are logged with level warn
  logStream.on('data', line => {
    if (line.res) {
      t.equal(line.msg, 'stream closed prematurely')
      t.equal(line.level, 30)
    }
  })

  fastify.get('/', function (request, reply) {
    t.pass('Received request')

    let sent = false
    const reallyLongStream = new stream.Readable({
      read: function () {
        if (!sent) {
          this.push(Buffer.from('hello\n'))
        }
        sent = true
      }
    })
    reallyLongStream.destroy = undefined
    reallyLongStream.close = () => t.ok('called')
    reply.send(reallyLongStream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    const port = fastify.server.address().port

    http.get(`http://localhost:${port}`, function (response) {
      t.equal(response.statusCode, 200)
      response.on('readable', function () {
        response.destroy()
      })
      // Node bug? Node never emits 'close' here.
      response.on('aborted', function () {
        t.pass('Response closed')
      })
    })
  })
})

test('Destroying streams prematurely should call close method when destroy is not a function', t => {
  t.plan(7)

  let fastify = null
  const logStream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: logStream,
        level: 'info'
      }
    })
  } catch (e) {
    t.fail()
  }
  const stream = require('stream')
  const http = require('http')

  // Test that "premature close" errors are logged with level warn
  logStream.on('data', line => {
    if (line.res) {
      t.equal(line.msg, 'stream closed prematurely')
      t.equal(line.level, 30)
    }
  })

  fastify.get('/', function (request, reply) {
    t.pass('Received request')

    let sent = false
    const reallyLongStream = new stream.Readable({
      read: function () {
        if (!sent) {
          this.push(Buffer.from('hello\n'))
        }
        sent = true
      }
    })
    reallyLongStream.destroy = true
    reallyLongStream.close = () => t.ok('called')
    reply.send(reallyLongStream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    const port = fastify.server.address().port

    http.get(`http://localhost:${port}`, function (response) {
      t.equal(response.statusCode, 200)
      response.on('readable', function () {
        response.destroy()
      })
      // Node bug? Node never emits 'close' here.
      response.on('aborted', function () {
        t.pass('Response closed')
      })
    })
  })
})

test('Destroying streams prematurely should call abort method', t => {
  t.plan(7)

  let fastify = null
  const logStream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: logStream,
        level: 'info'
      }
    })
  } catch (e) {
    t.fail()
  }
  const stream = require('stream')
  const http = require('http')

  // Test that "premature close" errors are logged with level warn
  logStream.on('data', line => {
    if (line.res) {
      t.equal(line.msg, 'stream closed prematurely')
      t.equal(line.level, 30)
    }
  })

  fastify.get('/', function (request, reply) {
    t.pass('Received request')

    let sent = false
    const reallyLongStream = new stream.Readable({
      read: function () {
        if (!sent) {
          this.push(Buffer.from('hello\n'))
        }
        sent = true
      }
    })
    reallyLongStream.destroy = undefined
    reallyLongStream.close = undefined
    reallyLongStream.abort = () => t.ok('called')
    reply.send(reallyLongStream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    const port = fastify.server.address().port

    http.get(`http://localhost:${port}`, function (response) {
      t.equal(response.statusCode, 200)
      response.on('readable', function () {
        response.destroy()
      })
      // Node bug? Node never emits 'close' here.
      response.on('aborted', function () {
        t.pass('Response closed')
      })
    })
  })
})

test('Destroying streams prematurely, log is disabled', t => {
  t.plan(4)

  let fastify = null
  try {
    fastify = Fastify({
      logger: false
    })
  } catch (e) {
    t.fail()
  }
  const stream = require('stream')
  const http = require('http')

  fastify.get('/', function (request, reply) {
    reply.log[kDisableRequestLogging] = true

    let sent = false
    const reallyLongStream = new stream.Readable({
      read: function () {
        if (!sent) {
          this.push(Buffer.from('hello\n'))
        }
        sent = true
      }
    })
    reallyLongStream.destroy = true
    reallyLongStream.close = () => t.ok('called')
    reply.send(reallyLongStream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    const port = fastify.server.address().port

    http.get(`http://localhost:${port}`, function (response) {
      t.equal(response.statusCode, 200)
      response.on('readable', function () {
        response.destroy()
      })
      // Node bug? Node never emits 'close' here.
      response.on('aborted', function () {
        t.pass('Response closed')
      })
    })
  })
})

test('should respond with a stream1', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    const stream = JSONStream.stringify()
    reply.code(200).type('application/json').send(stream)
    stream.write({ hello: 'world' })
    stream.end({ a: 42 })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget(`http://localhost:${fastify.server.address().port}`, function (err, response, body) {
      t.error(err)
      t.equal(response.headers['content-type'], 'application/json')
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), [{ hello: 'world' }, { a: 42 }])
    })
  })
})

test('return a 404 if the stream emits a 404 error', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    t.pass('Received request')

    const reallyLongStream = new Readable({
      read: function () {
        setImmediate(() => {
          this.emit('error', new errors.NotFound())
        })
      }
    })

    reply.send(reallyLongStream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    const port = fastify.server.address().port

    sget(`http://localhost:${port}`, function (err, response) {
      t.error(err)
      t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
      t.equal(response.statusCode, 404)
    })
  })
})

test('should support send module 200 and 404', { only: true }, t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    const stream = send(req.raw, __filename)
    reply.code(200).send(stream)
  })

  fastify.get('/error', function (req, reply) {
    const stream = send(req.raw, 'non-existing-file')
    reply.code(200).send(stream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    const url = getUrl(fastify)

    sget(url, function (err, response, data) {
      t.error(err)
      t.equal(response.headers['content-type'], 'application/octet-stream')
      t.equal(response.statusCode, 200)

      fs.readFile(__filename, (err, expected) => {
        t.error(err)
        t.equal(expected.toString(), data.toString())
      })
    })

    sget(url + '/error', function (err, response) {
      t.error(err)
      t.equal(response.statusCode, 404)
    })
  })
})

test('should destroy stream when response is ended', t => {
  t.plan(4)
  const stream = require('stream')
  const fastify = Fastify()

  fastify.get('/error', function (req, reply) {
    const reallyLongStream = new stream.Readable({
      read: function () {},
      destroy: function (err, callback) {
        t.ok('called')
        callback(err)
      }
    })
    reply.code(200).send(reallyLongStream)
    reply.raw.end(Buffer.from('hello\n'))
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget(`http://localhost:${fastify.server.address().port}/error`, function (err, response) {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
  })
})

test('should mark reply as sent before pumping the payload stream into response for async route handler', t => {
  t.plan(3)

  const handleRequest = proxyquire('../lib/handleRequest', {
    './wrapThenable': (thenable, reply) => {
      thenable.then(function (payload) {
        t.equal(reply[kReplySent], true)
      })
    }
  })

  const route = proxyquire('../lib/route', {
    './handleRequest': handleRequest
  })

  const Fastify = proxyquire('..', {
    './lib/route': route
  })

  const fastify = Fastify()

  fastify.get('/', async function (req, reply) {
    const stream = fs.createReadStream(__filename, 'utf8')
    reply.code(200).send(stream)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, fs.readFileSync(__filename, 'utf8'))
    fastify.close()
  })
})
