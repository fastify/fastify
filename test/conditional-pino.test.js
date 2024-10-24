'use strict'

const t = require('tap')
const nullLogger = require('abstract-logging')
const test = t.test

test("pino is not require'd if logger is not passed", t => {
  let called = false
  const loggerMock = {
    createLogger: () => {
      called = true
      return {
        logger: nullLogger,
        hasLogger: true
      }
    }
  }
  t.plan(1)
  const fastify = t.mockRequire('..', {
    '../lib/logger.js': loggerMock,
  })
  fastify()
  t.equal(called, false)
})

test("pino is require'd if logger is passed", t => {
  let called = false
  const loggerMock = {
    createLogger: () => {
      called = true
      return {
        logger: nullLogger,
        hasLogger: true
      }
    }
  }
  t.plan(1)
  const fastify = t.mockRequire('..', {
    '../lib/logger.js': loggerMock,
  })
  fastify({
    logger: true
  })
  t.equal(called, true)
})
