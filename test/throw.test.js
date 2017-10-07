'use strict'

const test = require('tap').test
const fastify = require('..')()

test('Fastify should throw on wrong options', t => {
  t.plan(2)
  try {
    const f = require('..')('lol') // eslint-disable-line
    t.fail()
  } catch (e) {
    t.is(e.message, 'Options must be an object')
    t.pass()
  }
})

test('Fastify should throw on multiple assignment to the same route', t => {
  t.plan(1)
  fastify.get('/', () => {})
  fastify.get('/', () => {})

  fastify.ready(err => {
    t.is(err.message, 'GET already set for /')
  })
})

test('Should throw on unsupported method', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'TROLL',
      url: '/',
      schema: {},
      handler: function (req, reply) {}
    })
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('Should throw on missing handler', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'GET',
      url: '/'
    })
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('Should throw if one method is unsupported', t => {
  t.plan(1)
  try {
    fastify.route({
      method: ['GET', 'TROLL'],
      url: '/',
      schema: {},
      handler: function (req, reply) {}
    })
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('Should throw on duplicate content type parser', t => {
  t.plan(1)

  function customParser (req, done) { done(null, '') }

  fastify.addContentTypeParser('application/qq', customParser)
  try {
    fastify.addContentTypeParser('application/qq', customParser)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('Should throw on duplicate decorator', t => {
  t.plan(1)

  const fooObj = {}

  fastify.decorate('foo', fooObj)
  try {
    fastify.decorate('foo', fooObj)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('Should throw on duplicate decorator encapsulation', t => {
  t.plan(1)

  const foo2Obj = {}

  fastify.decorate('foo2', foo2Obj)

  fastify.register(function (fastify, opts, next) {
    try {
      fastify.decorate('foo2', foo2Obj)
      t.fail()
    } catch (e) {
      t.pass()
    }
    next()
  })
})

test('Should throw on duplicate request decorator', t => {
  t.plan(1)

  const fooObj = {}

  fastify.decorateRequest('foo', fooObj)
  try {
    fastify.decorateRequest('foo', fooObj)
    t.fail()
  } catch (e) {
    t.ok(/has been already added/.test(e.message))
  }
})

test('Should throw if request decorator dependencies are not met', t => {
  t.plan(1)

  const fooObj = {}

  try {
    fastify.decorateRequest('bar', fooObj, ['world'])
    t.fail()
  } catch (e) {
    t.ok(/missing dependency/.test(e.message))
  }
})

test('Should throw on duplicate reply decorator', t => {
  t.plan(1)

  const fooObj = {}

  fastify.decorateReply('foo', fooObj)
  try {
    fastify.decorateReply('foo', fooObj)
    t.fail()
  } catch (e) {
    t.ok(/has been already added/.test(e.message))
  }
})

test('Should throw if reply decorator dependencies are not met', t => {
  t.plan(1)

  const fooObj = {}

  try {
    fastify.decorateReply('bar', fooObj, ['world'])
    t.fail()
  } catch (e) {
    t.ok(/missing dependency/.test(e.message))
  }
})
