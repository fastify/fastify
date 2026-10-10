'use strict'

const { test } = require('node:test')
const FindMyWay = require('find-my-way')
const Fastify = require('..')
const { FST_ERR_INIT_OPTS_INVALID } = require('../lib/errors')

const RouterPrototype = Object.getPrototypeOf(FindMyWay())

function buildApp (opts) {
  const fastify = Fastify(opts)

  fastify.get('/', () => ({ route: 'root' }))
  fastify.get('/users/:id', (req) => ({ route: 'user', id: req.params.id }))
  fastify.post('/users', (req) => ({ route: 'create', body: req.body }))
  fastify.get('/files/*', (req) => ({ route: 'files', path: req.params['*'] }))
  fastify.get('/search', (req) => ({ route: 'search', query: req.query }))
  fastify.get('/versioned', { constraints: { version: '1.2.0' } }, () => ({ route: 'v1' }))
  fastify.get('/versioned', { constraints: { version: '2.0.0' } }, () => ({ route: 'v2' }))

  return fastify
}

async function assertRoutes (t, fastify) {
  let res = await fastify.inject('/')
  t.assert.deepStrictEqual(res.json(), { route: 'root' })

  res = await fastify.inject('/users/42')
  t.assert.deepStrictEqual(res.json(), { route: 'user', id: '42' })

  res = await fastify.inject('/users/caf%C3%A9')
  t.assert.deepStrictEqual(res.json(), { route: 'user', id: 'café' })

  res = await fastify.inject({ method: 'POST', url: '/users', payload: { name: 'foo' } })
  t.assert.deepStrictEqual(res.json(), { route: 'create', body: { name: 'foo' } })

  res = await fastify.inject('/files/a/b/c.txt')
  t.assert.deepStrictEqual(res.json(), { route: 'files', path: 'a/b/c.txt' })

  res = await fastify.inject('/search?q=fastify')
  t.assert.deepStrictEqual(res.json(), { route: 'search', query: { q: 'fastify' } })

  res = await fastify.inject({ url: '/versioned', headers: { 'accept-version': '2.x' } })
  t.assert.deepStrictEqual(res.json(), { route: 'v2' })

  res = await fastify.inject({ method: 'HEAD', url: '/users/42' })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.body, '')

  res = await fastify.inject('/not-found')
  t.assert.strictEqual(res.statusCode, 404)

  res = await fastify.inject({ method: 'DELETE', url: '/users/42' })
  t.assert.strictEqual(res.statusCode, 404)
}

test('routerOptions.compile defaults to true', async t => {
  const compile = t.mock.method(RouterPrototype, 'compile')
  const fastify = buildApp()
  t.after(() => fastify.close())

  t.assert.strictEqual(fastify.initialConfig.routerOptions.compile, true)
  await fastify.ready()
  t.assert.strictEqual(compile.mock.callCount(), 1)
  await assertRoutes(t, fastify)
})

test('routerOptions.compile: false does not compile the routes', async t => {
  const compile = t.mock.method(RouterPrototype, 'compile')
  const fastify = buildApp({ routerOptions: { compile: false } })
  t.after(() => fastify.close())

  t.assert.strictEqual(fastify.initialConfig.routerOptions.compile, false)
  await assertRoutes(t, fastify)
  t.assert.strictEqual(compile.mock.callCount(), 0)
})

test('routerOptions.compile: true compiles the routes on ready', async t => {
  const compile = t.mock.method(RouterPrototype, 'compile')
  const fastify = buildApp({ routerOptions: { compile: true } })
  t.after(() => fastify.close())

  t.assert.strictEqual(fastify.initialConfig.routerOptions.compile, true)
  await fastify.ready()
  t.assert.strictEqual(compile.mock.callCount(), 1)
  await assertRoutes(t, fastify)
  t.assert.strictEqual(compile.mock.callCount(), 1)
})

test('routerOptions.compile: true works with real http requests', async t => {
  const fastify = buildApp({ routerOptions: { compile: true } })
  t.after(() => fastify.close())

  const address = await fastify.listen({ port: 0 })

  let res = await fetch(address + '/users/42')
  t.assert.deepStrictEqual(await res.json(), { route: 'user', id: '42' })

  res = await fetch(address + '/files/a/b')
  t.assert.deepStrictEqual(await res.json(), { route: 'files', path: 'a/b' })

  res = await fetch(address + '/nope')
  t.assert.strictEqual(res.status, 404)
})

test('routerOptions.compile: true honors the other router options', async t => {
  const fastify = Fastify({
    routerOptions: {
      compile: true,
      ignoreTrailingSlash: true,
      ignoreDuplicateSlashes: true,
      caseSensitive: false,
      maxParamLength: 5
    }
  })
  t.after(() => fastify.close())

  fastify.get('/foo/:id', (req) => ({ id: req.params.id }))

  let res = await fastify.inject('/foo/abc/')
  t.assert.deepStrictEqual(res.json(), { id: 'abc' })

  res = await fastify.inject('//FOO//abc')
  t.assert.deepStrictEqual(res.json(), { id: 'abc' })

  res = await fastify.inject('/foo/toolongparam')
  t.assert.strictEqual(res.statusCode, 414)
})

test('routerOptions.compile: true supports rewriteUrl', async t => {
  const fastify = Fastify({
    routerOptions: { compile: true },
    rewriteUrl: (req) => req.url === '/old' ? '/new' : req.url
  })
  t.after(() => fastify.close())

  fastify.get('/new', () => ({ route: 'new' }))

  const res = await fastify.inject('/old')
  t.assert.deepStrictEqual(res.json(), { route: 'new' })
})

test('routerOptions.compile: true supports asynchronous constraints', async t => {
  const fastify = Fastify({
    routerOptions: {
      compile: true,
      constraints: {
        secret: {
          name: 'secret',
          storage () {
            const secrets = {}
            return {
              get: (secret) => secrets[secret] ?? null,
              set: (secret, store) => { secrets[secret] = store }
            }
          },
          deriveConstraint (req, ctx, done) {
            setImmediate(() => done(null, req.headers['x-secret']))
          },
          validate () { return true }
        }
      }
    }
  })
  t.after(() => fastify.close())

  fastify.get('/', { constraints: { secret: 'alpha' } }, () => ({ secret: 'alpha' }))
  fastify.get('/', { constraints: { secret: 'beta' } }, () => ({ secret: 'beta' }))

  let res = await fastify.inject({ url: '/', headers: { 'x-secret': 'beta' } })
  t.assert.deepStrictEqual(res.json(), { secret: 'beta' })

  res = await fastify.inject({ url: '/', headers: { 'x-secret': 'gamma' } })
  t.assert.strictEqual(res.statusCode, 404)
})

test('routerOptions.compile: true supports encapsulated 404 handlers', async t => {
  const fastify = Fastify({ routerOptions: { compile: true } })
  t.after(() => fastify.close())

  fastify.register(async (instance) => {
    instance.setNotFoundHandler((req, reply) => {
      reply.code(404).send({ notFound: 'api' })
    })
    instance.get('/ok', () => ({ ok: true }))
  }, { prefix: '/api' })

  let res = await fastify.inject('/api/ok')
  t.assert.deepStrictEqual(res.json(), { ok: true })

  res = await fastify.inject('/api/missing')
  t.assert.deepStrictEqual(res.json(), { notFound: 'api' })
})

test('routerOptions.compile: true keeps findRoute and hasRoute working', async t => {
  const fastify = Fastify({ routerOptions: { compile: true } })
  t.after(() => fastify.close())

  fastify.get('/users/:id', () => ({}))
  await fastify.ready()

  t.assert.ok(fastify.hasRoute({ method: 'GET', url: '/users/:id' }))
  const route = fastify.findRoute({ method: 'GET', url: '/users/42' })
  t.assert.deepStrictEqual({ ...route.params }, { id: '42' })
  t.assert.strictEqual(fastify.findRoute({ method: 'GET', url: '/nope' }), null)
})

test('routerOptions.compile must be a boolean', t => {
  t.assert.throws(
    () => Fastify({ routerOptions: { compile: 'yes' } }),
    FST_ERR_INIT_OPTS_INVALID
  )
})
