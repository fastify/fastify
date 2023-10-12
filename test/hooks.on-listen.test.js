'use strict'

const { test, before } = require('tap')
const Fastify = require('../fastify')
const fp = require('fastify-plugin')
const split = require('split2')
const helper = require('./helper')

// fix citgm @aix72-ppc64
const LISTEN_READYNESS = process.env.CITGM ? 250 : 50

let localhost
before(async function () {
  [localhost] = await helper.getLoopbackHost()
})

test('onListen should not be processed when .ready() is called', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.addHook('onListen', function (done) {
    t.fail()
    done()
  })

  fastify.ready(err => t.error(err))
})

test('localhost onListen should be called in order', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, '1st called in root')
    done()
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 2, '2nd called in root')
    done()
  })

  fastify.listen({
    host: 'localhost',
    port: 0
  })
})

test('localhost async onListen should be called in order', async t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  let order = 0

  fastify.addHook('onListen', async function () {
    t.equal(++order, 1, '1st async called in root')
  })

  fastify.addHook('onListen', async function () {
    t.equal(++order, 2, '2nd async called in root')
  })

  await fastify.listen({
    host: 'localhost',
    port: 0
  })
  t.equal(order, 2, 'the onListen hooks are awaited')
})

test('localhost onListen sync should log errors as warnings and continue /1', async t => {
  t.plan(8)
  let order = 0
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  stream.on('data', message => {
    if (message.msg.includes('FAIL ON LISTEN')) {
      t.equal(order, 2)
      t.pass('Logged Error Message')
    }
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, '1st call')
    t.pass('called in root')
    done()
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 2, '2nd call')
    t.pass('called onListen error')
    throw new Error('FAIL ON LISTEN')
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 3, '3rd call')
    t.pass('onListen hooks continue after error')
    done()
  })

  await fastify.listen({
    host: 'localhost',
    port: 0
  })
})

test('localhost onListen sync should log errors as warnings and continue /2', t => {
  t.plan(7)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  let order = 0

  stream.on('data', message => {
    if (message.msg.includes('FAIL ON LISTEN')) {
      t.pass('Logged Error Message')
    }
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, '1st call')
    t.pass('called in root')
    done()
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 2, '2nd call')
    t.pass('called onListen error')
    done(new Error('FAIL ON LISTEN'))
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 3, '3rd call')
    t.pass('onListen hooks continue after error')
    done()
  })

  fastify.listen({
    host: 'localhost',
    port: 0
  })
})

test('localhost onListen async should log errors as warnings and continue', async t => {
  t.plan(4)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  stream.on('data', message => {
    if (message.msg.includes('FAIL ON LISTEN')) {
      t.pass('Logged Error Message')
    }
  })

  fastify.addHook('onListen', async function () {
    t.pass('called in root')
  })

  fastify.addHook('onListen', async function () {
    t.pass('called onListen error')
    throw new Error('FAIL ON LISTEN')
  })

  fastify.addHook('onListen', async function () {
    t.pass('onListen hooks continue after error')
  })

  await fastify.listen({
    host: 'localhost',
    port: 0
  })
})

test('localhost Register onListen hook after a plugin inside a plugin', t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.pass('called')
      done()
    })
    done()
  }))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.pass('called')
      done()
    })

    instance.addHook('onListen', function (done) {
      t.pass('called')
      done()
    })

    done()
  }))

  fastify.listen({
    host: 'localhost',
    port: 0
  })
})

test('localhost Register onListen hook after a plugin inside a plugin should log errors as warnings and continue', t => {
  t.plan(6)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  stream.on('data', message => {
    if (message.msg.includes('Plugin Error')) {
      t.pass('Logged Error Message')
    }
  })

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function () {
      t.pass('called')
      throw new Error('Plugin Error')
    })
    done()
  }))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function () {
      t.pass('called')
      throw new Error('Plugin Error')
    })

    instance.addHook('onListen', function () {
      t.pass('called')
      throw new Error('Plugin Error')
    })

    done()
  }))

  fastify.listen({
    host: 'localhost',
    port: 0
  })
})

test('localhost onListen encapsulation should be called in order', t => {
  t.plan(6)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, 'called in root')
    t.equal(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onListen', function (done) {
      t.equal(++order, 2, 'called in childOne')
      t.equal(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
      done()
    })
    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onListen', async function () {
        t.equal(++order, 3, 'called in childTwo')
        t.equal(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
      })
    })
  })
  fastify.listen({
    host: 'localhost',
    port: 0
  })
})

test('localhost onListen encapsulation should be called in order and should log errors as warnings and continue', t => {
  t.plan(7)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  stream.on('data', message => {
    if (message.msg.includes('Error in onListen hook of childTwo')) {
      t.pass('Logged Error Message')
    }
  })

  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, 'called in root')
    t.equal(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onListen', function (done) {
      t.equal(++order, 2, 'called in childOne')
      t.equal(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
      done()
    })
    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onListen', async function () {
        t.equal(++order, 3, 'called in childTwo')
        t.equal(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
        throw new Error('Error in onListen hook of childTwo')
      })
    })
  })
  fastify.listen({
    host: 'localhost',
    port: 0
  })
})

test('non-localhost onListen should be called in order', t => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, '1st called in root')
    done()
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 2, '2nd called in root')
    done()
  })
  fastify.listen({
    host: '::1',
    port: 0
  })
})

test('non-localhost async onListen should be called in order', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  let order = 0

  fastify.addHook('onListen', async function () {
    t.equal(++order, 1, '1st async called in root')
  })

  fastify.addHook('onListen', async function () {
    t.equal(++order, 2, '2nd async called in root')
  })

  await fastify.listen({
    host: '::1',
    port: 0
  })
})

test('non-localhost sync onListen should log errors as warnings and continue', t => {
  t.plan(4)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  stream.on('data', message => {
    if (message.msg.includes('FAIL ON LISTEN')) {
      t.pass('Logged Error Message')
    }
  })
  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1)
    done()
  })

  fastify.addHook('onListen', function () {
    t.equal(++order, 2)
    throw new Error('FAIL ON LISTEN')
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 3, 'should still run')
    done()
  })

  fastify.listen({
    host: '::1',
    port: 0
  })
})

test('non-localhost async onListen should log errors as warnings and continue', async t => {
  t.plan(6)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  stream.on('data', message => {
    if (message.msg.includes('FAIL ON LISTEN')) {
      t.pass('Logged Error Message')
    }
  })

  let order = 0

  fastify.addHook('onListen', async function () {
    t.equal(++order, 1)
    t.pass('called in root')
  })

  fastify.addHook('onListen', async function () {
    t.equal(++order, 2, '2nd async failed in root')
    throw new Error('FAIL ON LISTEN')
  })

  fastify.addHook('onListen', async function () {
    t.equal(++order, 3)
    t.pass('should still run')
  })

  await fastify.listen({
    host: '::1',
    port: 0
  })
})

test('non-localhost Register onListen hook after a plugin inside a plugin', t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.pass('called')
      done()
    })
    done()
  }))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.pass('called')
      done()
    })

    instance.addHook('onListen', function (done) {
      t.pass('called')
      done()
    })

    done()
  }))

  fastify.listen({
    host: '::1',
    port: 0
  })
})

test('non-localhost Register onListen hook after a plugin inside a plugin should log errors as warnings and continue', t => {
  t.plan(6)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  stream.on('data', message => {
    if (message.msg.includes('Plugin Error')) {
      t.pass('Logged Error Message')
    }
  })

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function () {
      t.pass('called')
      throw new Error('Plugin Error')
    })
    done()
  }))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function () {
      t.pass('called')
      throw new Error('Plugin Error')
    })

    instance.addHook('onListen', function () {
      t.pass('called')
      throw new Error('Plugin Error')
    })

    done()
  }))

  fastify.listen({
    host: '::1',
    port: 0
  })
})

test('non-localhost onListen encapsulation should be called in order', t => {
  t.plan(6)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, 'called in root')
    t.equal(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onListen', function (done) {
      t.equal(++order, 2, 'called in childOne')
      t.equal(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
      done()
    })
    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onListen', async function () {
        t.equal(++order, 3, 'called in childTwo')
        t.equal(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
      })
    })
  })
  fastify.listen({
    host: '::1',
    port: 0
  })
})

test('non-localhost onListen encapsulation should be called in order and should log errors as warnings and continue', t => {
  t.plan(7)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  stream.on('data', message => {
    if (message.msg.includes('Error in onListen hook of childTwo')) {
      t.pass('Logged Error Message')
    }
  })

  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, 'called in root')

    t.equal(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onListen', function (done) {
      t.equal(++order, 2, 'called in childOne')
      t.equal(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
      done()
    })
    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onListen', async function () {
        t.equal(++order, 3, 'called in childTwo')
        t.equal(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
        throw new Error('Error in onListen hook of childTwo')
      })
    })
  })
  fastify.listen({
    host: '::1',
    port: 0
  })
})

test('onListen localhost should work in order with callback', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, '1st called in root')
    done()
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 2, '2nd called in root')
    done()
  })

  fastify.listen({ port: 0 }, (err) => {
    t.equal(fastify.server.address().address, localhost)
    t.error(err)
  })
})

test('onListen localhost should work in order with callback in async', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  let order = 0

  fastify.addHook('onListen', async function () {
    t.equal(++order, 1, '1st called in root')
  })

  fastify.addHook('onListen', async function () {
    t.equal(++order, 2, '2nd called in root')
  })

  fastify.listen({ host: 'localhost', port: 0 }, (err) => {
    t.equal(fastify.server.address().address, localhost)
    t.error(err)
  })
})

test('onListen localhost sync with callback should log errors as warnings and continue', t => {
  t.plan(6)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  stream.on('data', message => {
    if (message.msg.includes('FAIL ON LISTEN')) {
      t.pass('Logged Error Message')
    }
  })

  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, '1st called in root')
    done()
  })

  fastify.addHook('onListen', function () {
    t.equal(++order, 2, 'error sync called in root')
    throw new Error('FAIL ON LISTEN')
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 3, '1st called in root')
    done()
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)
    t.equal(fastify.server.address().address, localhost)
  })
})

test('onListen localhost async with callback should log errors as warnings and continue', t => {
  t.plan(6)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  stream.on('data', message => {
    if (message.msg.includes('FAIL ON LISTEN')) {
      t.pass('Logged Error Message')
    }
  })

  let order = 0

  fastify.addHook('onListen', async function () {
    t.pass('1st called in root')
  })

  fastify.addHook('onListen', async function () {
    t.equal(++order, 1, 'error sync called in root')
    throw new Error('FAIL ON LISTEN')
  })

  fastify.addHook('onListen', async function () {
    t.pass('3rd called in root')
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)
    t.equal(fastify.server.address().address, localhost)
  })
})

test('Register onListen hook localhost with callback after a plugin inside a plugin', t => {
  t.plan(5)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.pass('called')
      done()
    })
    done()
  }))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.pass('called')
      done()
    })

    instance.addHook('onListen', function (done) {
      t.pass('called')
      done()
    })

    done()
  }))

  fastify.listen({ port: 0 }, (err) => {
    t.equal(fastify.server.address().address, localhost)
    t.error(err)
  })
})

test('onListen localhost with callback encapsulation should be called in order', t => {
  t.plan(8)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, 'called in root')
    t.equal(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onListen', function (done) {
      t.equal(++order, 2, 'called in childOne')
      t.equal(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
      done()
    })
    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onListen', async function () {
        t.equal(++order, 3, 'called in childTwo')
        t.equal(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
      })
    })
  })
  fastify.listen({ port: 0 }, (err) => {
    t.equal(fastify.server.address().address, localhost)
    t.error(err)
  })
})

test('onListen non-localhost should work in order with callback in sync', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, '1st called in root')
    done()
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 2, '2nd called in root')
    done()
  })

  fastify.listen({ host: '::1', port: 0 }, (err) => {
    t.equal(fastify.server.address().address, '::1')
    t.error(err)
  })
})

test('onListen non-localhost should work in order with callback in async', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  let order = 0

  fastify.addHook('onListen', async function () {
    t.equal(++order, 1, '1st called in root')
  })

  fastify.addHook('onListen', async function () {
    t.equal(++order, 2, '2nd called in root')
  })

  fastify.listen({ host: '::1', port: 0 }, (err) => {
    t.equal(fastify.server.address().address, '::1')
    t.error(err)
  })
})

test('onListen non-localhost sync with callback should log errors as warnings and continue', t => {
  t.plan(8)

  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  stream.on('data', message => {
    if (message.msg.includes('FAIL ON LISTEN')) {
      t.pass('Logged Error Message')
    }
  })

  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1)
    t.pass('1st called in root')
    done()
  })

  fastify.addHook('onListen', function () {
    t.equal(++order, 2)
    throw new Error('FAIL ON LISTEN')
  })

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 3)
    t.pass('3rd called in root')
    done()
  })

  fastify.listen({ host: '::1', port: 0 }, (err) => {
    t.error(err)
    t.equal(fastify.server.address().address, '::1')
  })
})

test('onListen non-localhost async with callback should log errors as warnings and continue', t => {
  t.plan(8)

  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.teardown(fastify.close.bind(fastify))

  stream.on('data', message => {
    if (message.msg.includes('FAIL ON LISTEN')) {
      t.pass('Logged Error Message')
    }
  })

  let order = 0

  fastify.addHook('onListen', async function () {
    t.equal(++order, 1)
    t.pass('1st called in root')
  })

  fastify.addHook('onListen', async function () {
    t.equal(++order, 2, 'error sync called in root')
    throw new Error('FAIL ON LISTEN')
  })

  fastify.addHook('onListen', async function () {
    t.equal(++order, 3)
    t.pass('3rd called in root')
  })

  fastify.listen({ host: '::1', port: 0 }, (err) => {
    t.error(err)
    t.equal(fastify.server.address().address, '::1')
  })
})

test('Register onListen hook non-localhost with callback after a plugin inside a plugin', t => {
  t.plan(5)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.pass('called')
      done()
    })
    done()
  }))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.pass('called')
      done()
    })

    instance.addHook('onListen', function (done) {
      t.pass('called')
      done()
    })

    done()
  }))

  fastify.listen({ host: '::1', port: 0 }, (err) => {
    t.equal(fastify.server.address().address, '::1')
    t.error(err)
  })
})

test('onListen non-localhost with callback encapsulation should be called in order', t => {
  t.plan(8)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  let order = 0

  fastify.addHook('onListen', function (done) {
    t.equal(++order, 1, 'called in root')
    t.equal(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onListen', function (done) {
      t.equal(++order, 2, 'called in childOne')
      t.equal(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
      done()
    })
    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onListen', async function () {
        t.equal(++order, 3, 'called in childTwo')
        t.equal(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
      })
    })
  })
  fastify.listen({ host: '::1', port: 0 }, (err) => {
    t.equal(fastify.server.address().address, '::1')
    t.error(err)
  })
})

test('onListen sync should work if user does not pass done', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  let order = 0

  fastify.addHook('onListen', function () {
    t.equal(++order, 1, '1st called in root')
  })

  fastify.addHook('onListen', function () {
    t.equal(++order, 2, '2nd called in root')
  })

  fastify.listen({
    host: 'localhost',
    port: 0
  })
})

test('async onListen does not need to be awaited', t => {
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  let order = 0

  fastify.addHook('onListen', async function () {
    t.equal(++order, 1, '1st async called in root')
  })

  fastify.addHook('onListen', async function () {
    t.equal(++order, 2, '2nd async called in root')
    t.end()
  })

  fastify.listen({
    host: 'localhost',
    port: 0
  })
})

test('onListen hooks do not block /1', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.addHook('onListen', function (done) {
    setTimeout(done, 500)
  })

  const startDate = new Date()
  fastify.listen({
    host: 'localhost',
    port: 0
  }, err => {
    t.error(err)
    t.ok(new Date() - startDate < LISTEN_READYNESS)
  })
})

test('onListen hooks do not block /2', async t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.addHook('onListen', async function () {
    await new Promise(resolve => setTimeout(resolve, 500))
  })

  const startDate = new Date()
  await fastify.listen({
    host: 'localhost',
    port: 0
  })
  t.ok(new Date() - startDate < LISTEN_READYNESS)
})
