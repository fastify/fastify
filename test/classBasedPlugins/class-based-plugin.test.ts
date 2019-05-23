const test = require('tap').test
const fastify = require('../../')
const { Get, Hook } = fastify;
import 'reflect-metadata'
const sget = require('simple-get').concat

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

