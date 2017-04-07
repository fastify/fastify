'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const Fastify = require('..')
const jsonParser = require('body/json')

test('contentTypeParser method should exist', t => {
  t.plan(1)
  const fastify = Fastify()
  t.ok(fastify.contentTypeParser)
})

test('contentTypeParser should add a custom parser', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.contentTypeParser.add('application/jsoff', function (req, done) {
    jsonParser(req, function (err, body) {
      if (err) return done(err)
      done(body)
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body, JSON.stringify({ hello: 'world' }))
      fastify.close()
    })
  })
})

test('contentTypeParser should handle multiple custom parsers', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.post('/hello', (req, reply) => {
    reply.send(req.body)
  })

  function customParser (req, done) {
    jsonParser(req, function (err, body) {
      if (err) return done(err)
      done(body)
    })
  }

  fastify.contentTypeParser.add('application/jsoff', customParser)
  fastify.contentTypeParser.add('application/ffosj', customParser)

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body, JSON.stringify({ hello: 'world' }))
    })

    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port + '/hello',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/ffosj'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body, JSON.stringify({ hello: 'world' }))
    })
  })
})

test('contentTypeParser should handle errors', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.contentTypeParser.add('application/jsoff', function (req, done) {
    done(new Error('kaboom!'))
  })

  fastify.listen(0, err => {
    t.error(err)

    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
      fastify.close()
    })
  })
})

test('contentTypeParser should support encapsulation', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.contentTypeParser.add('application/jsoff', () => {})
    t.ok(instance.contentTypeParser.hasParser('application/jsoff'))

    instance.register((instance, opts, next) => {
      instance.contentTypeParser.add('application/ffosj', () => {})
      t.ok(instance.contentTypeParser.hasParser('application/jsoff'))
      t.ok(instance.contentTypeParser.hasParser('application/ffosj'))
      next()
    })

    next()
  })

  fastify.ready(err => {
    t.error(err)
    t.notOk(fastify.contentTypeParser.hasParser('application/jsoff'))
    t.notOk(fastify.contentTypeParser.hasParser('application/ffosj'))
  })
})

test('contentTypeParser should support encapsulation, second try', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.post('/', (req, reply) => {
      reply.send(req.body)
    })

    instance.contentTypeParser.add('application/jsoff', function (req, done) {
      jsonParser(req, function (err, body) {
        if (err) return done(err)
        done(body)
      })
    })

    next()
  })

  fastify.listen(0, err => {
    t.error(err)

    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body, JSON.stringify({ hello: 'world' }))
      fastify.close()
    })
  })
})
