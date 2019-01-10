'use strict'

const { test } = require('tap')
const Fastify = require('..')

test('should emit warning using genReqId prop in logger options', t => {
  t.plan(1)

  process.once('warning', warning => {
    t.strictEqual(warning.message, `Using 'genReqId' in logger options is deprecated. Use fastify options instead. See: https://www.fastify.io/docs/latest/Server/#gen-request-id`)
  })

  Fastify({ logger: { genReqId: 'test' } })
})

test('should emit warning if basePath prop is used', t => {
  t.plan(1)

  process.once('warning', warning => {
    t.strictEqual(warning.message, `basePath is deprecated. Use prefix instead. See: https://www.fastify.io/docs/latest/Server/#prefix`)
  })

  const fastify = Fastify({ basePath: '/test' })
  return fastify.basePath
})

test('should emit warning if preHandler is used', t => {
  t.plan(1)

  process.once('warning', warning => {
    t.strictEqual(warning.message, `The route option \`beforeHandler\` has been deprecated, use \`preHandler\` instead`)
  })

  const fastify = Fastify()

  fastify.setNotFoundHandler({
    beforeHandler: (req, reply, done) => done()
  }, () => {})
})
