'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('pretty print - static routes', t => {
  t.plan(2)

  const fastify = Fastify()
  fastify.get('/test', () => {})
  fastify.get('/test/hello', () => {})
  fastify.get('/hello/world', () => {})

  fastify.ready(() => {
    const tree = fastify.printRoutes()

    const expected = `└── /
    ├── test (GET)
    │   └── /hello (GET)
    └── hello/world (GET)
`

    t.is(typeof tree, 'string')
    t.equal(tree, expected)
  })
})

test('pretty print - parametric routes', t => {
  t.plan(2)

  const fastify = Fastify()
  fastify.get('/test', () => {})
  fastify.get('/test/:hello', () => {})
  fastify.get('/hello/:world', () => {})

  fastify.ready(() => {
    const tree = fastify.printRoutes()

    const expected = `└── /
    ├── test (GET)
    │   └── /:hello (GET)
    └── hello/:world (GET)
`

    t.is(typeof tree, 'string')
    t.equal(tree, expected)
  })
})

test('pretty print - mixed parametric routes', t => {
  t.plan(2)

  const fastify = Fastify()
  fastify.get('/test', () => {})
  fastify.get('/test/:hello', () => {})
  fastify.post('/test/:hello', () => {})
  fastify.get('/test/:hello/world', () => {})

  fastify.ready(() => {
    const tree = fastify.printRoutes()

    const expected = `└── /test (GET)
    └── /
        └── :hello (GET)
            :hello (POST)
            └── /world (GET)
`

    t.is(typeof tree, 'string')
    t.equal(tree, expected)
  })
})

test('pretty print - wildcard routes', t => {
  t.plan(2)

  const fastify = Fastify()
  fastify.get('/test', () => {})
  fastify.get('/test/*', () => {})
  fastify.get('/hello/*', () => {})

  fastify.ready(() => {
    const tree = fastify.printRoutes()

    const expected = `└── /
    ├── test (GET)
    │   └── /* (GET)
    └── hello/* (GET)
`

    t.is(typeof tree, 'string')
    t.equal(tree, expected)
  })
})
