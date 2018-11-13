'use strict'

const t = require('tap')
const sget = require('simple-get').concat

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

t.test('should receive application/json content-type', t => {
  t.plan(3)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.post('/', function (req, reply) {
    reply.code(200).send(req.body)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'POST',
      body: {
        key: 'value'
      },
      json: true,
      headers: {
        'Content-Type': 'application/json'
      },
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res, body) => {
      t.error(err)
      t.strictDeepEqual(body, {
        key: 'value'
      })
    })
  })
})

t.test('should receive json body', t => {
  t.plan(3)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.post('/', function (req, reply) {
    reply.code(200).send(req.body)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'POST',
      body: {
        key: 'value'
      },
      json: true,
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res, body) => {
      t.error(err)
      t.strictDeepEqual(body, {
        key: 'value'
      })
    })
  })
})

t.test('should fail with empty body and application/json content-type', t => {
  t.plan(3)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.post('/', function (req, reply) {
    reply.code(200).send('failed')
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res, body) => {
      t.error(err)
      t.strictDeepEqual(JSON.parse(body.toString()), {
        error: 'Bad Request',
        code: 'FST_ERR_CTP_EMPTY_JSON_BODY',
        message: `FST_ERR_CTP_EMPTY_JSON_BODY: Body cannot be empty when content-type is set to 'application/json'`,
        statusCode: 400
      })
    })
  })
})

t.test('should fail with null body and application/json content-type', t => {
  t.plan(2)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.post('/', function (req, reply) {
    reply.code(200).send('failed')
  })

  fastify.inject({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: null,
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictDeepEqual(JSON.parse(res.payload), {
      error: 'Bad Request',
      code: 'FST_ERR_CTP_EMPTY_JSON_BODY',
      message: `FST_ERR_CTP_EMPTY_JSON_BODY: Body cannot be empty when content-type is set to 'application/json'`,
      statusCode: 400
    })
  })
})

t.test('should fail with undefined body and application/json content-type', t => {
  t.plan(2)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.post('/', function (req, reply) {
    reply.code(200).send('failed')
  })

  fastify.inject({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: undefined,
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictDeepEqual(JSON.parse(res.payload), {
      error: 'Bad Request',
      code: 'FST_ERR_CTP_EMPTY_JSON_BODY',
      message: `FST_ERR_CTP_EMPTY_JSON_BODY: Body cannot be empty when content-type is set to 'application/json'`,
      statusCode: 400
    })
  })
})
