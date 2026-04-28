'use strict'

const { test, before } = require('node:test')
const Fastify = require('../fastify')
const fp = require('fastify-plugin')
const split = require('split2')
const helper = require('./helper')
const { kState } = require('../lib/symbols')
const { networkInterfaces } = require('node:os')

const isIPv6Missing = !Object.values(networkInterfaces()).flat().some(({ family }) => family === 'IPv6')

let localhost
before(async function () {
  [localhost] = await helper.getLoopbackHost()
})

test('onListen should not be processed when .ready() is called', (t, testDone) => {
  t.plan(1)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addHook('onListen', function (done) {
    t.assert.fail()
    done()
  })

  fastify.ready(err => {
    t.assert.ifError(err)
    testDone()
  })
})

test('localhost onListen should be called in order', (t, testDone) => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())
  let order = 0

  fastify.addHook('onListen', function (done) {
    t.assert.strictEqual(++order, 1, '1st called in root')
    done()
  })

  fastify.addHook('onListen', function (done) {
    t.assert.strictEqual(++order, 2, '2nd called in root')
    done()
  })

  fastify.listen({
    host: 'localhost',
    port: 0
  }, testDone)
})

test('localhost async onListen should be called in order', async t => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())
  let order = 0

  fastify.addHook('onListen', async function () {
    t.assert.strictEqual(++order, 1, '1st async called in root')
  })

  fastify.addHook('onListen', async function () {
    t.assert.strictEqual(++order, 2, '2nd async called in root')
  })

  await fastify.listen({
    host: 'localhost',
    port: 0
  })
  t.assert.strictEqual(order, 2, 'the onListen hooks are awaited')
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
  t.after(() => fastify.close())

  stream.on('data', message => {
    if (message.msg.includes('FAIL ON LISTEN')) {
      t.assert.strictEqual(order, 2)
      t.assert.ok('Logged Error Message')
    }
  })

  fastify.addHook('onListen', function (done) {
    t.assert.strictEqual(++order, 1, '1st call')
    t.assert.ok('called in root')
    done()
  })

  fastify.addHook('onListen', function (done) {
    t.assert.strictEqual(++order, 2, '2nd call')
    t.assert.ok('called onListen error')
    throw new Error('FAIL ON LISTEN')
  })

  fastify.addHook('onListen', function (done) {
    t.assert.strictEqual(++order, 3, '3rd call')
    t.assert.ok('onListen hooks continue after error')
    done()
  })

  await fastify.listen({
    host: 'localhost',
    port: 0
  })
})

test('localhost onListen sync should log errors as warnings and continue /2', (t, testDone) => {
  t.plan(7)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.after(() => fastify.close())

  let order = 0

  stream.on('data', message => {
    if (message.msg.includes('FAIL ON LISTEN')) {
      t.assert.ok('Logged Error Message')
    }
  })

  fastify.addHook('onListen', function (done) {
    t.assert.strictEqual(++order, 1, '1st call')
    t.assert.ok('called in root')
    done()
  })

  fastify.addHook('onListen', function (done) {
    t.assert.strictEqual(++order, 2, '2nd call')
    t.assert.ok('called onListen error')
    done(new Error('FAIL ON LISTEN'))
  })

  fastify.addHook('onListen', function (done) {
    t.assert.strictEqual(++order, 3, '3rd call')
    t.assert.ok('onListen hooks continue after error')
    done()
  })

  fastify.listen({
    host: 'localhost',
    port: 0
  }, testDone)
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
  t.after(() => fastify.close())

  stream.on('data', message => {
    if (message.msg.includes('FAIL ON LISTEN')) {
      t.assert.ok('Logged Error Message')
    }
  })

  fastify.addHook('onListen', async function () {
    t.assert.ok('called in root')
  })

  fastify.addHook('onListen', async function () {
    t.assert.ok('called onListen error')
    throw new Error('FAIL ON LISTEN')
  })

  fastify.addHook('onListen', async function () {
    t.assert.ok('onListen hooks continue after error')
  })

  await fastify.listen({
    host: 'localhost',
    port: 0
  })
})

test('localhost Register onListen hook after a plugin inside a plugin', (t, testDone) => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.assert.ok('called')
      done()
    })
    done()
  }))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.assert.ok('called')
      done()
    })

    instance.addHook('onListen', function (done) {
      t.assert.ok('called')
      done()
    })

    done()
  }))

  fastify.listen({
    host: 'localhost',
    port: 0
  }, testDone)
})

test('localhost Register onListen hook after a plugin inside a plugin should log errors as warnings and continue', (t, testDone) => {
  t.plan(6)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    forceCloseConnections: false,
    logger: {
      stream,
      level: 'info'
    }
  })
  t.after(() => fastify.close())

  stream.on('data', message => {
    if (message.msg.includes('Plugin Error')) {
      t.assert.ok('Logged Error Message')
    }
  })

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.assert.ok('called')
      done(new Error('Plugin Error'))
    })
    done()
  }))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.assert.ok('called')
      done()
    })

    instance.addHook('onListen', function (done) {
      t.assert.ok('called')
      done()
    })

    done()
  }))

  fastify.listen({
    host: 'localhost',
    port: 0
  }, (err) => {
    t.assert.ifError(err)
    testDone()
  })
})