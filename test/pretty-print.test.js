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

    t.equal(typeof tree, 'string')
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

    t.equal(typeof tree, 'string')
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

    t.equal(typeof tree, 'string')
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

    t.equal(typeof tree, 'string')
    t.equal(tree, expected)
  })
})

test('pretty print - empty plugins', t => {
  t.plan(2)

  const fastify = Fastify()
  fastify.ready(() => {
    const tree = fastify.printPlugins()
    t.equal(typeof tree, 'string')
    t.match(tree, 'bound root')
  })
})

test('pretty print - nested plugins', t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(async function foo (instance) {
    instance.register(async function bar () {})
    instance.register(async function baz () {})
  })
  fastify.ready(() => {
    const tree = fastify.printPlugins()
    t.equal(typeof tree, 'string')
    t.match(tree, 'foo')
    t.match(tree, 'bar')
    t.match(tree, 'baz')
  })
})
