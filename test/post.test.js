'use strict'

const t = require('tap')
require('./helper').payloadMethod('post', t)
require('./input-validation').payloadMethod('post', t)

const Fastify = require('..')

t.test('cannot set schemaCompiler after binding', t => {
  t.plan(2)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    try {
      fastify.setSchemaCompiler(() => { })
      t.fail()
    } catch (e) {
      t.pass()
    }
  })
})
