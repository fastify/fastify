'use strict'

const t = require('tap')
const Joi = require('joi')
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

t.test('get schemaCompiler is empty for schemaCompilere settle on routes', t => {
  t.plan(2)

  const fastify = Fastify()

  const body = Joi.object().keys({
    name: Joi.string(),
    work: Joi.string()
  }).required()

  const schemaCompiler = schema => data => Joi.validate(data, schema)

  fastify.post('/', {
    schema: { body },
    schemaCompiler
  }, function (req, reply) {
    reply.send('ok')
  })

  fastify.inject({
    method: 'POST',
    payload: {},
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(fastify.schemaCompiler, null)
  })
})
