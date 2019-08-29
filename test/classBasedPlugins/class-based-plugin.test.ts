import { test } from 'tap'
import fastify, {
  Get,
  Hook,
  DecorateInstance,
  DecorateRequest,
  DecorateReply,
  FastifyInstance,
  RawServerBase,
  RawRequestDefaultExpression,
  RawServerDefault,
  RawReplyDefaultExpression,
  FastifyLoggerOptions
} from '../../'
import { concat } from 'simple-get'
import { AddressInfo } from 'net'
import { pluginDecoratorsWarning } from '../../lib/warnings'

interface InstanceWithConf<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger = FastifyLoggerOptions<RawServer>
> extends FastifyInstance<RawServer, RawRequest, RawReply, Logger> {
  conf: {
    db: string;
    port: number;
  };
}

test('Should register route', (t): void => {
  t.plan(5)

  class TestPlugin {
    @Get('/')
    public async handler (): Promise<string> {
      t.pass('route called')
      return 'hello world!'
    }
  }

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, (err): void => {
    t.error(err)
    app.server.unref()
    const port = (app.server.address() as AddressInfo).port

    concat({
      method: 'GET',
      url: 'http://localhost:' + port
    }, (err, response, body): void => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), 'hello world!')
    })
  })
})

test('Should register hook', (t): void => {
  t.plan(6)

  class TestPlugin {
    @Hook('onSend')
    public hook (request, reply, payload, next): void {
      t.pass('onSend hook executed')
      next()
    }

    @Get('/')
    public async handler (): Promise<string> {
      t.pass('route called')
      return 'hello world!'
    }
  }

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, (err): void => {
    t.error(err)
    app.server.unref()
    const port = (app.server.address() as AddressInfo).port

    concat({
      method: 'GET',
      url: 'http://localhost:' + port
    }, (err, response, body): void => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), 'hello world!')
    })
  })
})

test('Should register async hook', (t): void => {
  t.plan(6)

  class TestPlugin {
    @Hook('onSend')
    public async hook (): Promise<void> {
      t.pass('onSend hook executed')
    }

    @Get('/')
    public async handler (): Promise<string> {
      t.pass('route called')
      return 'hello world!'
    }
  }

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, (err): void => {
    t.error(err)
    app.server.unref()
    const port = (app.server.address() as AddressInfo).port

    concat({
      method: 'GET',
      url: 'http://localhost:' + port
    }, (err, response, body): void => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), 'hello world!')
    })
  })
})

test('Should decorate request', (t): void => {
  t.plan(6)

  class TestPlugin {
    @DecorateRequest()
    public test: number = 42

    @DecorateRequest('utility')
    public addUtilityFunction (): (template, args) => string {
      return function utility (template, args): string {
        return 'hello world'
      }
    }

    @Get('/')
    public async handler (request, reply): Promise<void> {
      t.ok(typeof request.utility === 'function')
      t.equals(request.test, 42)
      reply.send(request.utility())
    }
  }

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, (err): void => {
    t.error(err)
    app.server.unref()
    const port = (app.server.address() as AddressInfo).port

    concat({
      method: 'GET',
      url: 'http://localhost:' + port
    }, (err, response, body): void => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), 'hello world')
    })
  })
})

test('should decorate instance', (t): void => {
  t.plan(2)

  class TestPlugin {
    @DecorateInstance()
    public conf = {
      db: 'some.db',
      port: 3000
    }
  }
  TestPlugin.prototype[Symbol.for('skip-override')] = true

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, (err): void => {
    t.error(err)
    app.server.unref()
    t.deepEqual((app as InstanceWithConf).conf, {
      db: 'some.db',
      port: 3000
    })
  })
})

test('Should decorate reply', (t): void => {
  t.plan(7)

  class TestPlugin {
    @DecorateReply()
    public headerDefaultValue = '42'

    @DecorateReply('testHeader')
    public addViewFunction (): (value?: string) => void {
      const headerDefaultValue = this.headerDefaultValue
      return function testHeader (value): void {
        this.header('x-test', value || headerDefaultValue)
      }
    }

    @Get('/')
    public async handler (request, reply): Promise<void> {
      t.ok(typeof reply.testHeader === 'function')
      t.equals(reply.headerDefaultValue, '42')
      reply.testHeader()
      reply.send('hello world')
    }
  }

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, (err): void => {
    t.error(err)
    app.server.unref()
    const port = (app.server.address() as AddressInfo).port

    concat({
      method: 'GET',
      url: 'http://localhost:' + port
    }, (err, response, body): void => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['x-test'], '42')
      t.deepEqual(body.toString(), 'hello world')
    })
  })
})

test('Should expose fastify instance to plugin', (t): void => {
  t.plan(5)

  class TestPlugin {
    private instance: FastifyInstance

    @Get('/')
    public async handler (): Promise<string> {
      t.ok(this.instance)
      return 'hello world!'
    }
  }

  const app = fastify()
  app.register(new TestPlugin())
  app.listen(0, (err): void => {
    t.error(err)
    app.server.unref()
    const port = (app.server.address() as AddressInfo).port

    concat({
      method: 'GET',
      url: 'http://localhost:' + port
    }, (err, response, body): void => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), 'hello world!')
    })
  })
})

test('should emit warning if plugin decorators are used', (t): void => {
  t.plan(1)
  pluginDecoratorsWarning.called = false

  process.on('warning', (warning): void => {
    t.strictEqual(warning.message, 'The plugin decorators are experimental')
  })

  // eslint-disable-next-line no-unused-vars
  class TestPlugin {
    @Get('/')
    public async test (): Promise<void> {}
  }
})
