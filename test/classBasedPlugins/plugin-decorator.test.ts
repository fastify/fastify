import { test } from 'tap'
import {
  Get,
  Post,
  Head,
  Put,
  Delete,
  Options,
  Patch,
  All,
  Hook,
  DecorateRequest,
  DecorateReply,
  DecorateInstance
} from '../../'
import { kPluginMetadata } from '../../lib/symbols'

test('Should add metadata to decorated class', (t): void => {
  t.plan(5)
  class TestPlugin {
    @Get('/')
    public async handler (): Promise<string> {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.ok(Array.isArray(metadata))
  t.equals(metadata.length, 1)
  t.equals(metadata[0].type, 'route')
  t.ok(typeof metadata[0].options.handler === 'function')
  t.equals(metadata[0].options.url, '/')
})

test('Should add method metadata for @Get', (t): void => {
  t.plan(1)
  class TestPlugin {
    @Get('/')
    public async handler (): Promise<string> {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'GET')
})

test('Should add metadata for @Post', (t): void => {
  t.plan(1)
  class TestPlugin {
    @Post('/')
    public async handler (): Promise<string> {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'POST')
})

test('Should add method metadata for @Head', (t): void => {
  t.plan(1)
  class TestPlugin {
    @Head('/')
    public async handler (): Promise<string> {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'HEAD')
})

test('Should add method metadata for @Delete', (t): void => {
  t.plan(1)
  class TestPlugin {
    @Delete('/')
    public async handler (): Promise<string> {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'DELETE')
})

test('Should add method metadata for @Patch', (t): void => {
  t.plan(1)
  class TestPlugin {
    @Patch('/')
    public async handler (): Promise<string> {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'PATCH')
})

test('Should add method metadata for @Put', (t): void => {
  t.plan(1)
  class TestPlugin {
    @Put('/')
    public async handler (): Promise<string> {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'PUT')
})

test('Should add method metadata for @Options', (t): void => {
  t.plan(1)
  class TestPlugin {
    @Options('/')
    public async handler (): Promise<string> {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'OPTIONS')
})

test('Should add method metadata for @All', (t): void => {
  t.plan(1)
  class TestPlugin {
    @All('/')
    public async handler (): Promise<string> {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.deepEquals(
    metadata[0].options.method,
    ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
  )
})

test('should be able to pass options', (t): void => {
  t.plan(1)
  const schema = {
    querystring: {
      name: { type: 'string' },
      excitement: { type: 'integer' }
    }
  }
  class TestPlugin {
    @All('/', { schema })
    public async handler (): Promise<string> {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.deepEquals(metadata[0].options.schema, schema)
})

test('should add metadata for @Hook decorator', (t): void => {
  t.plan(5)
  class TestPlugin {
    @Hook('onSend')
    public handler (request, reply, payload, next): void {
      next()
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.ok(Array.isArray(metadata))
  t.equals(metadata.length, 1)
  t.equals(metadata[0].type, 'hook')
  t.equals(metadata[0].name, 'onSend')
  t.ok(typeof metadata[0].handler === 'function')
})

test('should be able to use multiple decorators', (t): void => {
  t.plan(7)
  class TestPlugin {
    @Hook('onSend')
    public hook (request, reply, payload, next): void {
      next()
    }

    @Get('/')
    public async handler (): Promise<string> {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.ok(Array.isArray(metadata))
  t.equals(metadata.length, 2)

  t.equals(metadata[0].type, 'hook')
  t.ok(typeof metadata[0].handler === 'function')

  t.equals(metadata[1].type, 'route')
  t.ok(typeof metadata[1].options.handler === 'function')
  t.equals(metadata[1].options.url, '/')
})

test('should add metadata for @DecorateRequest', (t): void => {
  t.plan(14)
  class TestPlugin {
    @DecorateRequest()
    public test0 = 42

    @DecorateRequest('test1')
    public aName (): string {
      return 'test'
    }

    @DecorateRequest()
    public test2 (): string {
      return 'test'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.ok(Array.isArray(metadata))
  t.equals(metadata.length, 3)

  t.equals(metadata[0].type, 'decorateRequest')
  t.equals(metadata[0].value, 'test0')
  t.equals(metadata[0].name, 'test0')
  t.equals(metadata[0].isFunction, false)

  t.equals(metadata[1].type, 'decorateRequest')
  t.equals(metadata[1].value, 'aName')
  t.equals(metadata[1].name, 'test1')
  t.equals(metadata[1].isFunction, true)

  t.equals(metadata[2].type, 'decorateRequest')
  t.equals(metadata[2].value, 'test2')
  t.equals(metadata[2].name, 'test2')
  t.equals(metadata[2].isFunction, true)
})

test('should add metadata for @DecorateReply', (t): void => {
  t.plan(14)
  class TestPlugin {
    @DecorateReply()
    public test0 = 42

    @DecorateReply('test1')
    public aName (): string {
      return 'test'
    }

    @DecorateReply()
    public test2 (): string {
      return 'test'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.ok(Array.isArray(metadata))
  t.equals(metadata.length, 3)

  t.equals(metadata[0].type, 'decorateReply')
  t.equals(metadata[0].value, 'test0')
  t.equals(metadata[0].name, 'test0')
  t.equals(metadata[0].isFunction, false)

  t.equals(metadata[1].type, 'decorateReply')
  t.equals(metadata[1].value, 'aName')
  t.equals(metadata[1].name, 'test1')
  t.equals(metadata[1].isFunction, true)

  t.equals(metadata[2].type, 'decorateReply')
  t.equals(metadata[2].value, 'test2')
  t.equals(metadata[2].name, 'test2')
  t.equals(metadata[2].isFunction, true)
})

test('should add metadata for @DecorateInstance', (t): void => {
  t.plan(14)
  class TestPlugin {
    @DecorateInstance()
    public test0 = 42

    @DecorateInstance('test1')
    public aName (): string {
      return 'test'
    }

    @DecorateInstance()
    public test2 (): string {
      return 'test'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.ok(Array.isArray(metadata))
  t.equals(metadata.length, 3)

  t.equals(metadata[0].type, 'decorateInstance')
  t.equals(metadata[0].value, 'test0')
  t.equals(metadata[0].name, 'test0')
  t.equals(metadata[0].isFunction, false)

  t.equals(metadata[1].type, 'decorateInstance')
  t.equals(metadata[1].value, 'aName')
  t.equals(metadata[1].name, 'test1')
  t.equals(metadata[1].isFunction, true)

  t.equals(metadata[2].type, 'decorateInstance')
  t.equals(metadata[2].value, 'test2')
  t.equals(metadata[2].name, 'test2')
  t.equals(metadata[2].isFunction, true)
})
