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

test('pretty print - commonPrefix', t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.get('/hello', () => {})
  fastify.put('/hello', () => {})
  fastify.get('/helicopter', () => {})

  fastify.ready(() => {
    const radixTree = fastify.printRoutes()
    const flatTree = fastify.printRoutes({ commonPrefix: false })

    const radixExpected = `└── /
    ├── hel
    │   ├── lo (GET)
    │   └── icopter (GET)
    └── hello (PUT)
`
    const flatExpected = `└── / (-)
    ├── helicopter (GET)
    └── hello (GET, PUT)
`
    t.equal(typeof radixTree, 'string')
    t.equal(typeof flatTree, 'string')
    t.equal(radixTree, radixExpected)
    t.equal(flatTree, flatExpected)
  })
})

test('pretty print - includeMeta, includeHooks', t => {
  t.plan(6)

  const fastify = Fastify()
  const onTimeout = () => {}
  fastify.get('/hello', () => {})
  fastify.put('/hello', () => {})
  fastify.get('/helicopter', () => {})

  fastify.addHook('onRequest', () => {})
  fastify.addHook('onTimeout', onTimeout)

  fastify.ready(() => {
    const radixTree = fastify.printRoutes({ includeHooks: true, includeMeta: ['errorHandler'] })
    const flatTree = fastify.printRoutes({ commonPrefix: false, includeHooks: true, includeMeta: ['errorHandler'] })
    const hooksOnly = fastify.printRoutes({ commonPrefix: false, includeHooks: true })

    const radixExpected = `└── /
    ├── hel
    │   ├── lo (GET)
    │   │   • (onTimeout) ["onTimeout()"]
    │   │   • (onRequest) ["anonymous()"]
    │   │   • (errorHandler) "defaultErrorHandler()"
    │   └── icopter (GET)
    │       • (onTimeout) ["onTimeout()"]
    │       • (onRequest) ["anonymous()"]
    │       • (errorHandler) "defaultErrorHandler()"
    └── hello (PUT)
        • (onTimeout) ["onTimeout()"]
        • (onRequest) ["anonymous()"]
        • (errorHandler) "defaultErrorHandler()"
`
    const flatExpected = `└── / (-)
    ├── helicopter (GET)
    │   • (onTimeout) ["onTimeout()"]
    │   • (onRequest) ["anonymous()"]
    │   • (errorHandler) "defaultErrorHandler()"
    └── hello (GET, PUT)
        • (onTimeout) ["onTimeout()"]
        • (onRequest) ["anonymous()"]
        • (errorHandler) "defaultErrorHandler()"
`

    const hooksOnlyExpected = `└── / (-)
    ├── helicopter (GET)
    │   • (onTimeout) ["onTimeout()"]
    │   • (onRequest) ["anonymous()"]
    └── hello (GET, PUT)
        • (onTimeout) ["onTimeout()"]
        • (onRequest) ["anonymous()"]
`
    t.equal(typeof radixTree, 'string')
    t.equal(typeof flatTree, 'string')
    t.equal(typeof hooksOnlyExpected, 'string')
    t.equal(radixTree, radixExpected)
    t.equal(flatTree, flatExpected)
    t.equal(hooksOnly, hooksOnlyExpected)
  })
})
