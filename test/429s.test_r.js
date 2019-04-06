'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('..')


test('default 429', t => {
  t.plan(5)

  const test = t.test
  const fastify = Fastify()

  fastify.get('/service', {
    rateLimit: {
      max: 3,
      timeWindow: '1 minutes',
      prefixCache: 'prefix-service'
    }
  }, (req, reply) => {
    reply.send({ hello: 'service' })
  })

  fastify.get('/service/sub-service', (req, reply) => {
    reply.send({ hello: 'from sub service' })
  })

  fastify.get('/account', (req, reply) => {
    reply.send({ hello: 'from sub account' })
  })

  fastify.get('/account/sub-category-1', {
    rateLimit: {
      max: 5,
      timeWindow: '1 minutes',
      prefixCache: 'prefix-account'
    }
  }, (req, reply) => {
    reply.send({ hello: 'from sub account' })
  })

  fastify.get('/account/sub-category-2', {
    rateLimit: {
      max: 7,
      timeWindow: '1 minutes',
      prefixCache: 'prefix-account'
    }
  }, (req, reply) => {
    reply.send({ hello: 'from sub account' })
  })

  fastify.get('/home', (req, reply) => {
    reply.send({ hello: 'from home' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(3000, err => {
    if (err) throw err

    test('get /service raise 429 after 3 request under 1 minutes', t => {
      t.plan(3)
      for (let i = 1; i < 4; i++) {
        sget({
            method: 'GET',
            url: 'http://localhost:3000/service',
            body: {},
            json: true
          },
          (err, response, body) => {
            if (err) throw err
            if (i < 4) {
              t.strictEqual(response.statusCode, 200)
            } else {
              t.strictEqual(response.statusCode, 429)
            }
          })
      }
    })

    test('get /service/sub-service also raise 429 after 5 request under 1 minutes as /service as rate limit set', t => {
      t.plan(3)
      for (let i = 1; i < 4; i++) {
        sget({
            method: 'GET',
            url: 'http://localhost:3000/service/sub-service',
            body: {},
            json: true
          },
          (err, response, body) => {
            if (err) throw err
            if (i < 4) {
              t.strictEqual(response.statusCode, 200)
            } else {
              t.strictEqual(response.statusCode, 429)
            }
          })
      }
    })

    test('get /account/sub-category-1 raise 429 after 5 request under 1 minutes', t => {
      t.plan(5)
      for (let i = 1; i < 6; i++) {
        sget({
            method: 'GET',
            url: 'http://localhost:3000/account/sub-category-1',
            body: {},
            json: true
          },
          (err, response, body) => {
            if (err) throw err
            if (i < 6) {
              t.strictEqual(response.statusCode, 200)
            } else {
              t.strictEqual(response.statusCode, 429)
            }
          })
      }
    })

    test('get /account/sub-category-2 raise 429 after 7 request under 1 minutes', t => {
      t.plan(7)
      for (let i = 1; i < 8; i++) {
        sget({
            method: 'GET',
            url: 'http://localhost:3000/account/sub-category-2',
            body: {},
            json: true
          },
          (err, response, body) => {
            if (err) throw err
            if (i < 8) {
              t.strictEqual(response.statusCode, 200)
            } else {
              t.strictEqual(response.statusCode, 429)
            }
          })
      }
    })

    test('get /home should not raise 429 as no rate limit rule', t => {
      t.plan(50)
      for (let i = 1; i < 51; i++) {
        sget({
            method: 'GET',
            url: 'http://localhost:3000/home',
            body: {},
            json: true
          },
          (err, response, body) => {
            if (err) throw err
            t.strictEqual(response.statusCode, 200)
          })
      }
    })
    t.end()
  })
})




