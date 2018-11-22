'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const fp = require('fastify-plugin')

test('should return valid json', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify
    .get('/', (request, reply) => reply.send({ text: '/' }))
    .post('/test', (request, reply) => reply.send({ text: 'test' }))
    .use(function helloWorld (instance, req, res) {})
    .use('/abc', function routeABC (instance, req, res) {})
    .addHook('onRequest', function onRequestHook (req, res, next) {})
    .addHook('preHandler', function preHandlerHook (req, res, next) {})
    .addHook('onResponse', function onResponseHook (req, res, next) {})
    .addHook('onSend', function onSendHook (req, res, next) {})

  fastify.register(fp((instance, opts, next) => {
    instance.decorate('anonymousPlugin', (a, b) => a + b)
    next()
  }))

  fastify.ready(() => {
    t.strictDeepEqual(
      JSON.stringify(fastify),
      JSON.stringify({
        middlewares: {
          '/': ['helloWorld'],
          '/abc': ['routeABC']
        },
        hooks: {
          onRequest: ['onRequestHook'],
          preHandler: ['preHandlerHook'],
          onResponse: ['onResponseHook'],
          onSend: ['onSendHook'],
          preValidation: [],
          onError: []
        },
        plugins: ['cemre'] }))
  })
})
