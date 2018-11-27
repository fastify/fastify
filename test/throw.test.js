'use strict'

const { test } = require('tap')
const Fastify = require('..')

test('Fastify should throw on wrong options', t => {
  t.plan(2)
  try {
    Fastify('lol')
    t.fail()
  } catch (e) {
    t.is(e.message, 'Options must be an object')
    t.pass()
  }
})

test('Fastify should throw on multiple assignment to the same route', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.get('/', () => {})
  fastify.get('/', () => {})

  fastify.ready(err => {
    t.is(err.message, "Method 'GET' already declared for route '/'")
  })
})

test('Should throw on unsupported method', t => {
  t.plan(1)
  const fastify = Fastify()
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
  const fastify = Fastify()
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
  const fastify = Fastify()
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

  const fastify = Fastify()
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

  const fastify = Fastify()
  const fooObj = {}

  fastify.decorate('foo', fooObj)
  try {
    fastify.decorate('foo', fooObj)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('Should not throw on duplicate decorator encapsulation', t => {
  t.plan(1)

  const fastify = Fastify()
  const foo2Obj = {}

  fastify.decorate('foo2', foo2Obj)

  fastify.register(function (fastify, opts, next) {
    t.notThrow(() => {
      fastify.decorate('foo2', foo2Obj)
    })
    next()
  })

  fastify.ready()
})

test('Should throw on duplicate request decorator', t => {
  t.plan(2)

  const fooObj = {}
  const fastify = Fastify()

  fastify.decorateRequest('foo', fooObj)
  try {
    fastify.decorateRequest('foo', fooObj)
    t.fail()
  } catch (e) {
    t.is(e.code, 'FST_ERR_DEC_ALREADY_PRESENT')
    t.is(e.message, `FST_ERR_DEC_ALREADY_PRESENT: The decorator 'foo' has already been added!`)
  }
})

test('Should throw if request decorator dependencies are not met', t => {
  t.plan(2)

  const fastify = Fastify()
  const fooObj = {}

  try {
    fastify.decorateRequest('bar', fooObj, ['world'])
    t.fail()
  } catch (e) {
    t.is(e.code, 'FST_ERR_DEC_MISSING_DEPENDENCY')
    t.is(e.message, `FST_ERR_DEC_MISSING_DEPENDENCY: The decorator is missing dependency 'world'.`)
  }
})

test('Should throw on duplicate reply decorator', t => {
  t.plan(1)

  const fastify = Fastify()
  const fooObj = {}

  fastify.decorateReply('foo', fooObj)
  try {
    fastify.decorateReply('foo', fooObj)
    t.fail()
  } catch (e) {
    t.ok(/has already been added/.test(e.message))
  }
})

test('Should throw if reply decorator dependencies are not met', t => {
  t.plan(1)

  const fastify = Fastify()
  const fooObj = {}

  try {
    fastify.decorateReply('bar', fooObj, ['world'])
    t.fail()
  } catch (e) {
    t.ok(/missing dependency/.test(e.message))
  }
})

test('Should throw if handler as the third parameter to the shortcut method is missing and the second parameter is not a function and also not an object', t => {
  t.plan(5)

  const fastify = Fastify()

  try {
    fastify.get('/foo/1', '')
    t.fail()
  } catch (e) {
    t.pass()
  }

  try {
    fastify.get('/foo/2', 1)
    t.fail()
  } catch (e) {
    t.pass()
  }

  try {
    fastify.get('/foo/3', [])
    t.fail()
  } catch (e) {
    t.pass()
  }

  try {
    fastify.get('/foo/4', undefined)
    t.fail()
  } catch (e) {
    t.pass()
  }

  try {
    fastify.get('/foo/5', null)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('Should throw if handler as the third parameter to the shortcut method is missing and the second parameter is not a function and also not an object', t => {
  t.plan(5)

  const fastify = Fastify()

  try {
    fastify.get('/foo/1', '')
    t.fail()
  } catch (e) {
    t.pass()
  }

  try {
    fastify.get('/foo/2', 1)
    t.fail()
  } catch (e) {
    t.pass()
  }

  try {
    fastify.get('/foo/3', [])
    t.fail()
  } catch (e) {
    t.pass()
  }

  try {
    fastify.get('/foo/4', undefined)
    t.fail()
  } catch (e) {
    t.pass()
  }

  try {
    fastify.get('/foo/5', null)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('Should throw if there is handler function as the third parameter to the shortcut method and options as the second parameter is not an object', t => {
  t.plan(5)

  const fastify = Fastify()

  try {
    fastify.get('/foo/1', '', (req, res) => {})
    t.fail()
  } catch (e) {
    t.pass()
  }

  try {
    fastify.get('/foo/2', 1, (req, res) => {})
    t.fail()
  } catch (e) {
    t.pass()
  }

  try {
    fastify.get('/foo/3', [], (req, res) => {})
    t.fail()
  } catch (e) {
    t.pass()
  }

  try {
    fastify.get('/foo/4', undefined, (req, res) => {})
    t.fail()
  } catch (e) {
    t.pass()
  }

  try {
    fastify.get('/foo/5', null, (req, res) => {})
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('Should throw if found duplicate handler as the third parameter to the shortcut method and in options', t => {
  t.plan(1)

  const fastify = Fastify()

  try {
    fastify.get('/foo/abc', {
      handler: (req, res) => {}
    }, (req, res) => {})
    t.fail()
  } catch (e) {
    t.pass()
  }
})
