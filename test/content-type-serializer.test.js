'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('serializes a custom content type after preSerialization hooks', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addContentTypeSerializer('Application/XML', payload => payload.toXmlString())
  fastify.addHook('preSerialization', async (request, reply, payload) => {
    payload.message += ' world'
    return payload
  })
  fastify.get('/', async (request, reply) => {
    reply.type('Application/XML; charset=utf-8')
    return {
      message: 'hello',
      toXmlString () {
        return `<message>${this.message}</message>`
      }
    }
  })

  const response = await fastify.inject('/')

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(response.payload, '<message>hello world</message>')
})

test('prefers an exact parameterized content type', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addContentTypeSerializer('application/xml', () => 'default')
  fastify.addContentTypeSerializer('application/xml; version=1', () => 'version 1')
  fastify.get('/default', (request, reply) => {
    reply.type('application/xml; charset=utf-8').send({})
  })
  fastify.get('/versioned', (request, reply) => {
    reply.type('application/xml; version=1').send({})
  })

  const defaultResponse = await fastify.inject('/default')
  const versionedResponse = await fastify.inject('/versioned')

  t.assert.strictEqual(defaultResponse.payload, 'default')
  t.assert.strictEqual(versionedResponse.payload, 'version 1')
})

test('uses the most specific reply serializer', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.setReplySerializer(() => 'default')
  fastify.addContentTypeSerializer('application/xml', () => 'registered')
  fastify.get('/registered', (request, reply) => {
    reply.type('application/xml').send({})
  })
  fastify.get('/reply', (request, reply) => {
    reply.type('application/xml').serializer(() => 'reply').send({})
  })

  const registeredResponse = await fastify.inject('/registered')
  const replyResponse = await fastify.inject('/reply')

  t.assert.strictEqual(registeredResponse.payload, 'registered')
  t.assert.strictEqual(replyResponse.payload, 'reply')
})

test('content type serializers are encapsulated', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addContentTypeSerializer('application/xml', () => 'parent')
  fastify.get('/', (request, reply) => reply.type('application/xml').send({}))
  fastify.register(async instance => {
    instance.addContentTypeSerializer('application/xml', () => 'child')
    instance.get('/child', (request, reply) => reply.type('application/xml').send({}))
  })

  const parentResponse = await fastify.inject('/')
  const childResponse = await fastify.inject('/child')

  t.assert.strictEqual(parentResponse.payload, 'parent')
  t.assert.strictEqual(childResponse.payload, 'child')
})

test('validates content type serializer registrations', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  for (const contentType of [null, 'invalid']) {
    t.assert.throws(
      () => fastify.addContentTypeSerializer(contentType, () => 'serialized'),
      { code: 'FST_ERR_CTS_INVALID_TYPE' }
    )
  }
  t.assert.throws(
    () => fastify.addContentTypeSerializer('application/xml', 'serializer'),
    { code: 'FST_ERR_CTS_INVALID_HANDLER' }
  )

  fastify.addContentTypeSerializer('Application/XML', () => 'serialized')
  t.assert.throws(
    () => fastify.addContentTypeSerializer('application/xml', () => 'serialized'),
    { code: 'FST_ERR_CTS_ALREADY_PRESENT' }
  )

  await fastify.ready()

  t.assert.throws(
    () => fastify.addContentTypeSerializer('application/xml', () => 'serialized'),
    { code: 'FST_ERR_INSTANCE_ALREADY_LISTENING' }
  )
})

test('keeps rejecting objects for unregistered custom content types', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  let hookCalls = 0
  fastify.addHook('preSerialization', async (request, reply, payload) => {
    hookCalls++
    return payload
  })

  fastify.get('/', async (request, reply) => {
    reply.type('application/xml')
    return {}
  })

  const response = await fastify.inject('/')

  t.assert.strictEqual(response.statusCode, 500)
  t.assert.match(response.payload, /FST_ERR_REP_INVALID_PAYLOAD_TYPE/)
  t.assert.strictEqual(hookCalls, 0)
})

test('does not serialize buffers', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  let serializerCalls = 0
  fastify.addContentTypeSerializer('application/octet-stream', () => {
    serializerCalls++
    return 'serialized'
  })
  fastify.get('/', (request, reply) => {
    reply.type('application/octet-stream')
    return Buffer.from('raw')
  })

  const response = await fastify.inject('/')

  t.assert.strictEqual(response.payload, 'raw')
  t.assert.strictEqual(serializerCalls, 0)
})
