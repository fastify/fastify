'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const fp = require('fastify-plugin')

test('toString method should exist', t => {
  t.plan(1)
  const fastify = Fastify()
  t.ok(fastify.toString)
})

test('should return valid string', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.get('/', (request, reply) => reply.send({ text: '/' }))
  fastify.post('/test', (request, reply) => reply.send({ text: 'test' }))

  fastify.use(function helloWorld (instance, req, res) {
    console.log('Hello, World!')
  })

  fastify.use('/abc', function routeABC (instance, req, res) {
    console.log('ABC')
  })

  fastify.register(fp((instance, opts, next) => {
    instance.decorate('anonymousPlugin', (a, b) => a + b)
    next()
  }))

  fastify.register(fp(function standardPlugin (instance, opts, next) {
    instance.decorate('standardPlugin', (a, b) => a - b)
    next()
  }))

  const STR = `Top Level Hooks
├── onRequest (0 hooks): []
├── preHandler (0 hooks): []
├── onResponse (0 hooks): []
└── onSend (0 hooks): []

Routes
└── / (GET)
    └── test (POST)

Top Level Middleware
├── /: [helloWorld]
└── /abc: [routeABC]

Plugins
├── toString.test
└── standardPlugin`

  fastify.ready(() => {
    t.is(fastify.toString(), STR)
  })
})
