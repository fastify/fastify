'use strict'

const t = require('tap')
require('./helper').payloadMethod('post', t)
require('./input-validation').payloadMethod('post', t)

const Fastify = require('..')

t.test('cannot call setSchemaCompiler after binding', t => {
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

t.test('cannot set schemaCompiler after binding', t => {
  t.plan(2)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    try {
      fastify.schemaCompiler = () => { }
      t.fail()
    } catch (e) {
      t.pass()
    }
  })
})

t.test('get schemaCompiler after set schemaCompiler', t => {
  t.plan(2)
  const mySchemaCompiler = () => { }

  const fastify = Fastify()
  fastify.schemaCompiler = mySchemaCompiler
  const sc = fastify.schemaCompiler

  t.ok(Object.is(mySchemaCompiler, sc))
  fastify.ready(t.error)
})

t.test('get schemaCompiler after setSchemaCompiler', t => {
  t.plan(2)
  const mySchemaCompiler = () => { }

  const fastify = Fastify()
  fastify.setSchemaCompiler(mySchemaCompiler)
  const sc = fastify.schemaCompiler

  t.ok(Object.is(mySchemaCompiler, sc))
  fastify.ready(t.error)
})
