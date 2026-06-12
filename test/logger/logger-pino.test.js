'use strict'

const stream = require('node:stream')

const t = require('node:test')
const split = require('split2')

const { createPinoLogger } = require('../../lib/logger-pino')
const { on } = stream

t.test('createPinoLogger unit tests', { timeout: 60000 }, async (t) => {
  t.plan(3)

  await t.test('Should use custom serializer when provided with custom attribute key for req', async (t) => {
    t.plan(2)

    const loggerStream = split(JSON.parse)

    const logger = createPinoLogger({
      stream: loggerStream,
      level: 'info',
      customAttributeKeys: {
        req: 'httpRequest'
      },
      serializers: {
        httpRequest: function (req) {
          return {
            customField: 'customReqValue'
          }
        }
      }
    })

    logger.info({ httpRequest: { method: 'GET' } }, 'test message')

    await new Promise(resolve => setImmediate(resolve))

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'test message') {
        t.assert.ok(line.httpRequest, 'should have httpRequest key')
        t.assert.strictEqual(line.httpRequest.customField, 'customReqValue', 'should use custom serializer')
        break
      }
    }
  })

  await t.test('Should use custom serializer when provided with custom attribute key for res', async (t) => {
    t.plan(2)

    const loggerStream = split(JSON.parse)

    const logger = createPinoLogger({
      stream: loggerStream,
      level: 'info',
      customAttributeKeys: {
        res: 'httpResponse'
      },
      serializers: {
        httpResponse: function (reply) {
          return {
            customField: 'customResValue'
          }
        }
      }
    })

    logger.info({ httpResponse: { statusCode: 200 } }, 'test message')

    await new Promise(resolve => setImmediate(resolve))

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'test message') {
        t.assert.ok(line.httpResponse, 'should have httpResponse key')
        t.assert.strictEqual(line.httpResponse.customField, 'customResValue', 'should use custom serializer')
        break
      }
    }
  })

  await t.test('Should use custom serializer when provided with custom attribute key for err', async (t) => {
    t.plan(2)

    const loggerStream = split(JSON.parse)

    const logger = createPinoLogger({
      stream: loggerStream,
      level: 'info',
      customAttributeKeys: {
        err: 'httpError'
      },
      serializers: {
        httpError: function () {
          return {
            customField: 'customErrValue'
          }
        }
      }
    })

    logger.info({ httpError: new Error('test error') }, 'test message')

    await new Promise(resolve => setImmediate(resolve))

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'test message') {
        t.assert.ok(line.httpError, 'should have httpError key')
        t.assert.strictEqual(line.httpError.customField, 'customErrValue', 'should use custom serializer')
        break
      }
    }
  })
})
