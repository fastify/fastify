'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const fp = require('fastify-plugin')

test('should return valid json', t => {
  t.plan(1)
  const fastify = Fastify()

  const routeA = function (fastify, opts, next) {
    fastify.post('/hello/:world', {
      bodyLimit: 2000,
      logLevel: 'info',
      schema: {}
    }, function (request, reply) { reply.send({ hello: 'world' }) })

    next()
  }

  fastify
    .register(routeA, { prefix: '/v1' })
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
        plugins: ['cemre'],
        routes: {
          '/v1/hello/:world': {
            'post': {
              'method': 'POST',
              'schema': {},
              'url': '/v1/hello/:world',
              'logLevel': 'info',
              'prefix': '/v1',
              'bodyLimit': 2000
            }
          }
        }
      }))
  })
})
