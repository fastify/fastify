
# Class based plugins

> Experimental

**Note**: It is required to enable the `experimentalDecorators` compiler option to be able to use the typescript decorators.

```ts
class MyPlugin extends AbstractPlugin {
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

## Routes

Routes can be defined with the method decorators.

There is a decorator for each http method supported by fastify: `Get`, `Post`, `Delete`, `Put`, `Head`, `Patch` and `Options`

Furthermore there is a `All` decorator that allows to add the same handler to all the supported methods.

The first argument of the method decorators is the url.

```ts
import { Get, Post } from 'fastify'

class UserController extends AbstractPlugin {
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

class MyPlugin extends AbstractPlugin {
  @Get('/', { schema })
  async route (request, reply) {
    return { hello: 'world' }
  }
}
```

## Hooks

```ts
import { Hook } from 'fastify'

class MyPlugin extends AbstractPlugin {
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

```ts
import { DecorateInstance } from 'fastify'

class MyPlugin extends AbstractPlugin {
  @DecorateInstance()
  conf = { db: 'some.db', port: 3000 }
}
```

```ts
import { DecorateReply } from 'fastify'

class MyPlugin extends AbstractPlugin {
  @DecorateReply('utility')
  addUtility () {
    return function () {
      // something very useful
    }
  }
}
```

```ts
import { DecorateRequest } from 'fastify'

class MyPlugin extends AbstractPlugin {
  @DecorateRequest('utility')
  addUtility () {
    return function () {
      // something very useful
    }
  }
}
```
