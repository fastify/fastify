import { test } from 'tap'
const fastify = require('../../')
const {
  Get,
  Hook,
  DecorateInstance,
  DecorateRequest,
  DecorateReply
} = fastify
const sget = require('simple-get').concat
import { FastifyInstance } from '../..'

test('Should register route', (t) => {
  t.plan(5)
  
  class TestPlugin {
    @Get('/')
    async handler (request, response) {
      t.pass('route called')
      return 'hello world!'
    }
  }

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, err => {
    t.error(err)
    app.server.unref()
    const port = app.server.address().port

    sget({
      method: 'GET',
      url: 'http://localhost:' + port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), 'hello world!')
    })
  })
})

test('Should register hook', (t) => {
  t.plan(6)
  
  class TestPlugin {
    @Hook('onSend')
    hook (request, reply, payload, next) {
      t.pass('onSend hook executed')
      next()
    }

    @Get('/')
    async handler (request, response) {
      t.pass('route called')
      return 'hello world!'
    }
  }

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, err => {
    t.error(err)
    app.server.unref()
    const port = app.server.address().port

    sget({
      method: 'GET',
      url: 'http://localhost:' + port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), 'hello world!')
    })
  })
})

test('Should register async hook', (t) => {
  t.plan(6)
  
  class TestPlugin {
    @Hook('onSend')
    async hook (request, reply, payload) {
      t.pass('onSend hook executed')
    }

    @Get('/')
    async handler (request, response) {
      t.pass('route called')
      return 'hello world!'
    }
  }

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, err => {
    t.error(err)
    app.server.unref()
    const port = app.server.address().port

    sget({
      method: 'GET',
      url: 'http://localhost:' + port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), 'hello world!')
    })
  })
})

test('Should decorate request', (t) => {
  t.plan(6)
  
  class TestPlugin {
    @DecorateRequest()
    test = 42

    @DecorateRequest('utility')
    addUtilityFunction () {
      return function utility (template, args) {
        return 'hello world'
      }
    }

    @Get('/')
    async handler (request, reply) {
      t.ok(typeof request.utility === 'function')
      t.equals(request.test, 42)
      reply.send(request.utility())
    }
  }

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, err => {
    t.error(err)
    app.server.unref()
    const port = app.server.address().port

    sget({
      method: 'GET',
      url: 'http://localhost:' + port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), 'hello world')
    })
  })
})

test('should decorate instance', (t) => {
  t.plan(2)

  class TestPlugin {
    @DecorateInstance()
    conf = {
      db: 'some.db',
      port: 3000
    }
  }
  TestPlugin.prototype[Symbol.for('skip-override')] = true

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, err => {
    t.error(err)
    app.server.unref()
    t.deepEqual(app.conf, {
      db: 'some.db',
      port: 3000
    })
  })
})

test('Should decorate reply', (t) => {
  t.plan(7)
  
  class TestPlugin {
    @DecorateReply()
    headerDefaultValue = '42'

    @DecorateReply('testHeader')
    addViewFunction () {
      const headerDefaultValue = this.headerDefaultValue
      return function testHeader (value) {
        this.header('x-test', value || headerDefaultValue)
      }
    }

    @Get('/')
    async handler (request, reply) {
      t.ok(typeof reply.testHeader === 'function')
      t.equals(reply.headerDefaultValue, '42')
      reply.testHeader()
      reply.send('hello world')
    }
  }

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, err => {
    t.error(err)
    app.server.unref()
    const port = app.server.address().port

    sget({
      method: 'GET',
      url: 'http://localhost:' + port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['x-test'], '42')
      t.deepEqual(body.toString(), 'hello world')
    })
  })
})

test('Should expose fastify instance to plugin', (t) => {
  t.plan(5)
  
  class TestPlugin {
    private instance: FastifyInstance

    @Get('/')
    async handler (request, response) {
      t.ok(this.instance)
      return 'hello world!'
    }
  }

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, err => {
    t.error(err)
    app.server.unref()
    const port = app.server.address().port

    sget({
      method: 'GET',
      url: 'http://localhost:' + port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), 'hello world!')
    })
  })
})
