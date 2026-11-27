'use strict'

const { test } = require('node:test')
const Fastify = require('../fastify')

test('addHook onClose supports AsyncDisposable objects', async t => {
  const app = Fastify()
  let disposed = false

  const resource = {
    async [Symbol.asyncDispose] () {
      disposed = true
    }
  }

  app.addHook('onClose', resource)
  await app.ready()
  t.assert.equal(disposed, false)

  await app.close()
  t.assert.equal(disposed, true)
})

test('addHook onClose supports synchronous Disposable objects', async t => {
  const app = Fastify()
  let disposed = false

  const resource = {
    [Symbol.dispose] () {
      disposed = true
    }
  }

  app.addHook('onClose', resource)
  await app.ready()
  t.assert.equal(disposed, false)

  await app.close()
  t.assert.equal(disposed, true)
})

test('addHook onClose prefers Symbol.asyncDispose over Symbol.dispose when both are present', async t => {
  const app = Fastify()
  let asyncDisposed = false
  let syncDisposed = false

  const resource = {
    async [Symbol.asyncDispose] () {
      asyncDisposed = true
    },
    [Symbol.dispose] () {
      syncDisposed = true
    }
  }

  app.addHook('onClose', resource)
  await app.ready()
  await app.close()

  t.assert.equal(asyncDisposed, true)
  t.assert.equal(syncDisposed, false)
})

test('addHook onClose propagates rejection from Symbol.asyncDispose', async t => {
  const app = Fastify()
  const customError = new Error('dispose async failed')

  const resource = {
    async [Symbol.asyncDispose] () {
      throw customError
    }
  }

  app.addHook('onClose', resource)
  await app.ready()

  await t.assert.rejects(app.close(), {
    message: 'dispose async failed'
  })
})

test('addHook onClose ignores fulfillment value from Symbol.asyncDispose', async t => {
  const app = Fastify()

  const resource = {
    async [Symbol.asyncDispose] () {
      return 'OK'
    }
  }

  app.addHook('onClose', resource)
  await app.ready()

  await t.assert.doesNotReject(app.close())
})

test('addHook onClose propagates thrown error from Symbol.dispose', async t => {
  const app = Fastify()
  const customError = new Error('dispose sync failed')

  const resource = {
    [Symbol.dispose] () {
      throw customError
    }
  }

  app.addHook('onClose', resource)
  await app.ready()

  await t.assert.rejects(app.close(), {
    message: 'dispose sync failed'
  })
})

test('addHook onClose respects plugin execution order for disposables', async t => {
  const app = Fastify()
  const order = []

  app.register(function childPlugin (instance, opts, done) {
    instance.addHook('onClose', {
      async [Symbol.asyncDispose] () {
        order.push('child')
      }
    })
    done()
  })

  app.addHook('onClose', {
    async [Symbol.asyncDispose] () {
      order.push('parent')
    }
  })

  await app.ready()
  await app.close()

  t.assert.deepStrictEqual(order, ['child', 'parent'])
})

test('addHook onClose throws FST_ERR_HOOK_INVALID_HANDLER when non-function non-disposable is passed', t => {
  const app = Fastify()

  t.assert.throws(() => {
    app.addHook('onClose', 'not-a-function-or-disposable')
  }, {
    code: 'FST_ERR_HOOK_INVALID_HANDLER'
  })

  t.assert.throws(() => {
    app.addHook('onClose', { someProp: 123 })
  }, {
    code: 'FST_ERR_HOOK_INVALID_HANDLER'
  })
})
