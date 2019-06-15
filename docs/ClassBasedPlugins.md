
# Class based plugins

> Experimental

Class based plugins allow to create [pulgins](./Plugins.md) using classes and typescript decorators. The decorators can define routes, hooks or decorate the fastify reply or response.

They can be registered the same way as functional plugins using the `register` API:

```js
fastify.register(plugin, [options])
```

**Note**: It is required to enable the `experimentalDecorators` compiler option to be able to use the typescript decorators.

```ts
class MyPlugin {
  constructor (options) {
    // ...
  }

  @Get('/')
  async route (request, reply) {
    return 'hello world'
  }
}

fastify.register(new MyPlugin({ /* plugin options */ }))
```

## Plugins Options

Options for the plugin can be passed using the constructor of the plugin:

```js
const options = {
  foo: {
    fooOption1: 'value',
    fooOption2: 'value'
  }
}
fastify.register(new MyPlugin(options))
```

The [logLevel](Plugins.md#plugin-options) and the [prefix](Plugins.md#plugin-options) option can be passed with the second parameter of the `register` API as with functional plugins.

## Routes

Routes can be defined with the method decorators. There is a decorator for each http method supported by fastify: `Get`, `Post`, `Delete`, `Put`, `Head`, `Patch` and `Options`

Furthermore there is a `All` decorator that allows to add the same handler to all the supported methods.

The first argument of the method decorators is the url.

```ts
import { Get, Post } from 'fastify'

class UserController {
  @Get('/user/:id')
  async getUser (request, reply) {
    // ...
  }

  @Post('/user/')
  async createUser (request, reply) {
    // ...
  }
}
```

The second argument of the method decorators are options (for available options see [here](./Routes.md)):

```ts
import { Get } from 'fastify'

const schema = {
  querystring: {
    name: { type: 'string' },
    excitement: { type: 'integer' }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        hello: { type: 'string' }
      }
    }
  }
}

class MyPlugin {
  @Get('/', { schema })
  async route (request, reply) {
    return { hello: 'world' }
  }
}
```

## Hooks

Hooks can be created using the `@Hook(hook)` decorator either with the `next` callback or `async/await`. 

For more information about hooks take a look at the [hooks](./Hooks.md) section.

```ts
import { Hook } from 'fastify'

class MyPlugin {
  @Hook('onRequest')
  hook (request, reply, next) {
    // ...
    next()
  }

  @Hook('onRequest')
  async asyncHook (request, reply) {
    // ...
  }
}
```

## Decoration of request, reply or instance

For more details on decorating the fastify request, reply or instance take a look at the [decorators](./Decorators.md) section.

The `@DecorateInstance(name)` decorator allows to add functionality to the fastify instance.

```ts
import { DecorateInstance } from 'fastify'

class MyPlugin {
  @DecorateInstance()
  conf = { db: 'some.db', port: 3000 }
}
```

The `@DecorateReply(name)` decorator allows to add functionality to the fastify reply. The decorated method must return the object or function that should be added to the reply.

```ts
import { DecorateReply } from 'fastify'

class MyPlugin {
  @DecorateReply('utility')
  addUtility () {
    return function () {
      // something very useful
    }
  }
}
```

The `@DecorateRequest(name)` decorator allows to add functionality to the fastify request. The decorated method must return the object or function that should be added to the request.

```ts
import { DecorateRequest } from 'fastify'

class MyPlugin {
  @DecorateRequest('utility')
  addUtility () {
    return function () {
      // something very useful
    }
  }
}
```
