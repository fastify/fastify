const test = require('tap').test
const fastify = require('../../')
const {
  Get, Post, Head, Put, Delete, Options, Patch, All, Hook
} = fastify;
import 'reflect-metadata'
const { kPluginMetadata } = require('../../lib/symbols')

test('Should add metadata to decorated class', (t: any) => {
  t.plan(6)
  class TestPlugin {
    @Get('/')
    async handler (request: any, response: any) {
      return 'hello world!'
    }
  }

  const metadata = Reflect.getMetadata(kPluginMetadata, new TestPlugin())

  t.ok(Array.isArray(metadata))
  t.equals(metadata.length, 1)
  t.equals(metadata[0].type, 'route')
  t.ok(typeof metadata[0].options.handler === 'function')
  t.ok(metadata[0].options.handler.name.startsWith('bound'))
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

  const metadata = Reflect.getMetadata(kPluginMetadata, new TestPlugin())

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

  const metadata = Reflect.getMetadata(kPluginMetadata, new TestPlugin())

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

  const metadata = Reflect.getMetadata(kPluginMetadata, new TestPlugin())

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

  const metadata = Reflect.getMetadata(kPluginMetadata, new TestPlugin())

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

  const metadata = Reflect.getMetadata(kPluginMetadata, new TestPlugin())

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

  const metadata = Reflect.getMetadata(kPluginMetadata, new TestPlugin())

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

  const metadata = Reflect.getMetadata(kPluginMetadata, new TestPlugin())

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

  const metadata = Reflect.getMetadata(kPluginMetadata, new TestPlugin())

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

  const metadata = Reflect.getMetadata(kPluginMetadata, new TestPlugin())

  t.deepEquals(metadata[0].options.schema, schema)
})

test('should add metadata for @Hook decorator', (t) => {
  t.plan(6)
  class TestPlugin {
    @Hook('onSend')
    handler (request, reply, payload, next) {
      next()
    }
  }

  const metadata = Reflect.getMetadata(kPluginMetadata, new TestPlugin())

  t.ok(Array.isArray(metadata))
  t.equals(metadata.length, 1)
  t.equals(metadata[0].type, 'hook')
  t.equals(metadata[0].name, 'onSend')
  t.ok(typeof metadata[0].handler === 'function')
  t.ok(metadata[0].handler.name.startsWith('bound'))
})

test('should be able to use multiple decorators', (t) => {
  t.plan(9)
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

  const metadata = Reflect.getMetadata(kPluginMetadata, new TestPlugin())

  t.ok(Array.isArray(metadata))
  t.equals(metadata.length, 2)

  t.equals(metadata[0].type, 'hook')
  t.ok(typeof metadata[0].handler === 'function')
  t.ok(metadata[0].handler.name.startsWith('bound'))

  t.equals(metadata[1].type, 'route')
  t.ok(typeof metadata[1].options.handler === 'function')
  t.ok(metadata[1].options.handler.name.startsWith('bound'))
  t.equals(metadata[1].options.url, '/')
})
