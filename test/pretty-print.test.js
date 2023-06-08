'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('pretty print - static routes', t => {
  t.plan(2)

  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.get('/test', () => {})
  fastify.get('/test/hello', () => {})
  fastify.get('/hello/world', () => {})

  fastify.ready(() => {
    const tree = fastify.printRoutes()

    const expected = `\
└── /
    ├── test (GET)
    │   └── /hello (GET)
    └── hello/world (GET)
`

    t.equal(typeof tree, 'string')
    t.equal(tree, expected)
  })
})

test('pretty print - internal tree - static routes', t => {
  t.plan(4)

  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.get('/test', () => {})
  fastify.get('/test/hello', () => {})
  fastify.get('/hello/world', () => {})

  fastify.put('/test', () => {})
  fastify.put('/test/foo', () => {})

  fastify.ready(() => {
    const getTree = fastify.printRoutes({ method: 'GET' })
    const expectedGetTree = `\
└── /
    ├── test (GET)
    │   └── /hello (GET)
    └── hello/world (GET)
`

    t.equal(typeof getTree, 'string')
    t.equal(getTree, expectedGetTree)

    const putTree = fastify.printRoutes({ method: 'PUT' })
    const expectedPutTree = `\
└── /
    └── test (PUT)
        └── /foo (PUT)
`

    t.equal(typeof putTree, 'string')
    t.equal(putTree, expectedPutTree)
  })
})

test('pretty print - parametric routes', t => {
  t.plan(2)

  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.get('/test', () => {})
  fastify.get('/test/:hello', () => {})
  fastify.get('/hello/:world', () => {})

  fastify.ready(() => {
    const tree = fastify.printRoutes()

    const expected = `\
└── /
    ├── test (GET)
    │   └── /
    │       └── :hello (GET)
    └── hello/
        └── :world (GET)
`

    t.equal(typeof tree, 'string')
    t.equal(tree, expected)
  })
})

test('pretty print - internal tree - parametric routes', t => {
  t.plan(4)

  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.get('/test', () => {})
  fastify.get('/test/:hello', () => {})
  fastify.get('/hello/:world', () => {})

  fastify.put('/test', () => {})
  fastify.put('/test/:hello', () => {})

  fastify.ready(() => {
    const getTree = fastify.printRoutes({ method: 'GET' })
    const expectedGetTree = `\
└── /
    ├── test (GET)
    │   └── /
    │       └── :hello (GET)
    └── hello/
        └── :world (GET)
`

    t.equal(typeof getTree, 'string')
    t.equal(getTree, expectedGetTree)

    const putTree = fastify.printRoutes({ method: 'PUT' })
    const expectedPutTree = `\
└── /
    └── test (PUT)
        └── /
            └── :hello (PUT)
`

    t.equal(typeof putTree, 'string')
    t.equal(putTree, expectedPutTree)
  })
})

test('pretty print - mixed parametric routes', t => {
  t.plan(2)

  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.get('/test', () => {})
  fastify.get('/test/:hello', () => {})
  fastify.post('/test/:hello', () => {})
  fastify.get('/test/:hello/world', () => {})

  fastify.ready(() => {
    const tree = fastify.printRoutes()

    const expected = `\
└── /
    └── test (GET)
        └── /
            └── :hello (GET, POST)
                └── /world (GET)
`

    t.equal(typeof tree, 'string')
    t.equal(tree, expected)
  })
})

test('pretty print - wildcard routes', t => {
  t.plan(2)

  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.get('/test', () => {})
  fastify.get('/test/*', () => {})
  fastify.get('/hello/*', () => {})

  fastify.ready(() => {
    const tree = fastify.printRoutes()

    const expected = `\
└── /
    ├── test (GET)
    │   └── /
    │       └── * (GET)
    └── hello/
        └── * (GET)
`

    t.equal(typeof tree, 'string')
    t.equal(tree, expected)
  })
})

test('pretty print - internal tree - wildcard routes', t => {
  t.plan(4)

  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.get('/test', () => {})
  fastify.get('/test/*', () => {})
  fastify.get('/hello/*', () => {})

  fastify.put('/*', () => {})
  fastify.put('/test/*', () => {})

  fastify.ready(() => {
    const getTree = fastify.printRoutes({ method: 'GET' })
    const expectedGetTree = `\
└── /
    ├── test (GET)
    │   └── /
    │       └── * (GET)
    └── hello/
        └── * (GET)
`

    t.equal(typeof getTree, 'string')
    t.equal(getTree, expectedGetTree)

    const putTree = fastify.printRoutes({ method: 'PUT' })
    const expectedPutTree = `\
└── /
    ├── test/
    │   └── * (PUT)
    └── * (PUT)
`

    t.equal(typeof putTree, 'string')
    t.equal(putTree, expectedPutTree)
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

    const radixExpected = `\
└── /
    └── hel
        ├── lo (GET, HEAD, PUT)
        └── icopter (GET, HEAD)
`
    const flatExpected = `\
├── /hello (GET, HEAD, PUT)
└── /helicopter (GET, HEAD)
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

    const radixExpected = `\
└── /
    └── hel
        ├── lo (GET, PUT)
        │   • (onTimeout) ["onTimeout()"]
        │   • (onRequest) ["anonymous()"]
        │   • (errorHandler) "defaultErrorHandler()"
        │   lo (HEAD)
        │   • (onTimeout) ["onTimeout()"]
        │   • (onRequest) ["anonymous()"]
        │   • (onSend) ["headRouteOnSendHandler()"]
        │   • (errorHandler) "defaultErrorHandler()"
        └── icopter (GET)
            • (onTimeout) ["onTimeout()"]
            • (onRequest) ["anonymous()"]
            • (errorHandler) "defaultErrorHandler()"
            icopter (HEAD)
            • (onTimeout) ["onTimeout()"]
            • (onRequest) ["anonymous()"]
            • (onSend) ["headRouteOnSendHandler()"]
            • (errorHandler) "defaultErrorHandler()"
`
    const flatExpected = `\
├── /hello (GET, PUT)
│   • (onTimeout) ["onTimeout()"]
│   • (onRequest) ["anonymous()"]
│   • (errorHandler) "defaultErrorHandler()"
│   /hello (HEAD)
│   • (onTimeout) ["onTimeout()"]
│   • (onRequest) ["anonymous()"]
│   • (onSend) ["headRouteOnSendHandler()"]
│   • (errorHandler) "defaultErrorHandler()"
└── /helicopter (GET)
    • (onTimeout) ["onTimeout()"]
    • (onRequest) ["anonymous()"]
    • (errorHandler) "defaultErrorHandler()"
    /helicopter (HEAD)
    • (onTimeout) ["onTimeout()"]
    • (onRequest) ["anonymous()"]
    • (onSend) ["headRouteOnSendHandler()"]
    • (errorHandler) "defaultErrorHandler()"
`

    const hooksOnlyExpected = `\
├── /hello (GET, PUT)
│   • (onTimeout) ["onTimeout()"]
│   • (onRequest) ["anonymous()"]
│   /hello (HEAD)
│   • (onTimeout) ["onTimeout()"]
│   • (onRequest) ["anonymous()"]
│   • (onSend) ["headRouteOnSendHandler()"]
└── /helicopter (GET)
    • (onTimeout) ["onTimeout()"]
    • (onRequest) ["anonymous()"]
    /helicopter (HEAD)
    • (onTimeout) ["onTimeout()"]
    • (onRequest) ["anonymous()"]
    • (onSend) ["headRouteOnSendHandler()"]
`
    t.equal(typeof radixTree, 'string')
    t.equal(typeof flatTree, 'string')
    t.equal(typeof hooksOnlyExpected, 'string')
    t.equal(radixTree, radixExpected)
    t.equal(flatTree, flatExpected)
    t.equal(hooksOnly, hooksOnlyExpected)
  })
})
