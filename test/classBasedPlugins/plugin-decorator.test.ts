import { test } from 'tap'
const fastify = require('../../')
const {
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
} = fastify;
const { kPluginMetadata } = require('../../lib/symbols')

test('Should add metadata to decorated class', (t: any) => {
  t.plan(5)
  class TestPlugin {
    @Get('/')
    async handler (request: any, response: any) {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin();
  const metadata = plugin[kPluginMetadata]

  t.ok(Array.isArray(metadata))
  t.equals(metadata.length, 1)
  t.equals(metadata[0].type, 'route')
  t.ok(typeof metadata[0].options.handler === 'function')
  t.equals(metadata[0].options.url, '/')
})

test('Should add method metadata for @Get', (t: any) => {
  t.plan(1)
  class TestPlugin {
    @Get('/')
    async handler (request: any, response: any) {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'GET')
})

test('Should add metadata for @Post', (t: any) => {
  t.plan(1)
  class TestPlugin {
    @Post('/')
    async handler (request: any, response: any) {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'POST')
})

test('Should add method metadata for @Head', (t: any) => {
  t.plan(1)
  class TestPlugin {
    @Head('/')
    async handler (request: any, response: any) {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'HEAD')
})

test('Should add method metadata for @Delete', (t: any) => {
  t.plan(1)
  class TestPlugin {
    @Delete('/')
    async handler (request: any, response: any) {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'DELETE')
})

test('Should add method metadata for @Patch', (t: any) => {
  t.plan(1)
  class TestPlugin {
    @Patch('/')
    async handler (request: any, response: any) {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'PATCH')
})

test('Should add method metadata for @Put', (t: any) => {
  t.plan(1)
  class TestPlugin {
    @Put('/')
    async handler (request: any, response: any) {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'PUT')
})

test('Should add method metadata for @Options', (t: any) => {
  t.plan(1)
  class TestPlugin {
    @Options('/')
    async handler (request: any, response: any) {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.equals(metadata[0].options.method, 'OPTIONS')
})

test('Should add method metadata for @All', (t: any) => {
  t.plan(1)
  class TestPlugin {
    @All('/')
    async handler (request: any, response: any) {
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

test('should be able to pass options', (t: any) => {
  t.plan(1)
  const schema = {
    querystring: {
      name: { type: 'string' },
      excitement: { type: 'integer' }
    }
  }
  class TestPlugin {
    @All('/', { schema })
    async handler (request, response) {
      return 'hello world!'
    }
  }

  const plugin = new TestPlugin()
  const metadata = plugin[kPluginMetadata]

  t.deepEquals(metadata[0].options.schema, schema)
})

test('should add metadata for @Hook decorator', (t) => {
  t.plan(5)
  class TestPlugin {
    @Hook('onSend')
    handler (request, reply, payload, next) {
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

test('should be able to use multiple decorators', (t) => {
  t.plan(7)
  class TestPlugin {
    @Hook('onSend')
    hook (request, reply, payload, next) {
      next()
    }

    @Get('/')
    async handler (request: any, response: any) {
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

test('should add metadata for @DecorateRequest', (t) => {
  t.plan(14)
  class TestPlugin {
    @DecorateRequest()
    test0 = 42

    @DecorateRequest('test1')
    aName () {
      return 'test'
    }

    @DecorateRequest()
    test2 () {
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

test('should add metadata for @DecorateReply', (t) => {
  t.plan(14)
  class TestPlugin {
    @DecorateReply()
    test0 = 42

    @DecorateReply('test1')
    aName () {
      return 'test'
    }

    @DecorateReply()
    test2 () {
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

test('should add metadata for @DecorateInstance', (t) => {
  t.plan(14)
  class TestPlugin {
    @DecorateInstance()
    test0 = 42

    @DecorateInstance('test1')
    aName () {
      return 'test'
    }

    @DecorateInstance()
    test2 () {
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
