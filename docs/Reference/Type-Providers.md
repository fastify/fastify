<h1 align="center">Fastify</h1>

## Type Providers

Type Providers are a TypeScript only feature that enables Fastify to statically
infer type information directly from inline JSON Schema. They are an alternative
to specifying generic arguments on routes; and can greatly reduce the need to
keep associated types for each schema defined in your project.

### Providers

Type Providers are offered as additional packages you will need to install into
your project. Each provider uses a different inference library under the hood;
allowing you to select the library most appropriate for your needs. Official Type
Provider packages follow a `@fastify/type-provider-{provider-name}` naming
convention, and there are several community ones available as well.

The following inference packages are supported:

- [`json-schema-to-ts`](https://github.com/ThomasAribart/json-schema-to-ts)
- [`typebox`](https://github.com/sinclairzx81/typebox)
- [`zod`](https://github.com/colinhacks/zod)

See also the Type Provider wrapper packages for each of the packages respectively:

- [`@fastify/type-provider-json-schema-to-ts`](https://github.com/fastify/fastify-type-provider-json-schema-to-ts)
- [`@fastify/type-provider-typebox`](https://github.com/fastify/fastify-type-provider-typebox)
- [`fastify-type-provider-zod`](https://github.com/turkerdev/fastify-type-provider-zod)
 (3rd party)

### Json Schema to Ts

The following sets up a `json-schema-to-ts` Type Provider

```bash
$ npm i @fastify/type-provider-json-schema-to-ts
```

```typescript
import { JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts'

import fastify from 'fastify'

const server = fastify().withTypeProvider<JsonSchemaToTsProvider>()

server.get('/route', {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                foo: { type: 'number' },
                bar: { type: 'string' },
            },
            required: ['foo', 'bar']
        }
    }

}, (request, reply) => {

    // type Query = { foo: number, bar: string }

    const { foo, bar } = request.query // type safe!
})
```

### TypeBox

The following sets up a TypeBox Type Provider

```bash
$ npm i @fastify/type-provider-typebox
```

```typescript
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

import fastify from 'fastify'

const server = fastify().withTypeProvider<TypeBoxTypeProvider>()

server.get('/route', {
    schema: {
        querystring: Type.Object({
            foo: Type.Number(),
            bar: Type.String()
        })
    }
}, (request, reply) => {

    // type Query = { foo: number, bar: string }

    const { foo, bar } = request.query // type safe!
})
```

See also the [TypeBox
documentation](https://github.com/sinclairzx81/typebox#validation) on how to set
up AJV to work with TypeBox.

### Zod

See [official documentation](https://github.com/turkerdev/fastify-type-provider-zod)
for Zod type provider instructions.


### Scoped Type-Provider

The provider types don't propagate globally. In encapsulated usage, one can
remap the context to use one or more providers (for example, `typebox` and
`json-schema-to-ts` can be used in the same application).

Example:

```ts
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts'
import { Type } from '@sinclair/typebox'

const fastify = Fastify()

function pluginWithTypebox(fastify: FastifyInstance, _opts, done): void {
  fastify.withTypeProvider<TypeBoxTypeProvider>()
    .get('/', {
      schema: {
        body: Type.Object({
          x: Type.String(),
          y: Type.Number(),
          z: Type.Boolean()
        })
      }
    }, (req) => {
        const { x, y, z } = req.body // type safe
    });
  done()
}

function pluginWithJsonSchema(fastify: FastifyInstance, _opts, done): void {
  fastify.withTypeProvider<JsonSchemaToTsProvider>()
    .get('/', {
      schema: {
        body: {
          type: 'object',
          properties: {
            x: { type: 'string' },
            y: { type: 'number' },
            z: { type: 'boolean' }
          },
        }
      }
    }, (req) => {
      const { x, y, z } = req.body // type safe
    });
  done()
}

fastify.register(pluginWithJsonSchema)
fastify.register(pluginWithTypebox)
```

It's also important to mention that once the types don't propagate globally,
_currently_ is not possible to avoid multiple registrations on routes when
dealing with several scopes, see below:

```ts
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

const server = Fastify().withTypeProvider<TypeBoxTypeProvider>()

server.register(plugin1) // wrong
server.register(plugin2) // correct

function plugin1(fastify: FastifyInstance, _opts, done): void {
  fastify.get('/', {
    schema: {
      body: Type.Object({
        x: Type.String(),
        y: Type.Number(),
        z: Type.Boolean()
      })
    }
  }, (req) => {
    // it doesn't work! in a new scope needs to call `withTypeProvider` again
    const { x, y, z } = req.body
  });
  done()
}

function plugin2(fastify: FastifyInstance, _opts, done): void {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>()

  server.get('/', {
    schema: {
      body: Type.Object({
        x: Type.String(),
        y: Type.Number(),
        z: Type.Boolean()
      })
    }
  }, (req) => {
    // works
    const { x, y, z } = req.body
  });
  done()
}
```

### Type Definition of FastifyInstance + TypeProvider

When working with modules one has to make use of `FastifyInstance` with Type
Provider generics. See the example below:

```ts
// index.ts
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { registerRoutes } from './routes'

const server = Fastify().withTypeProvider<TypeBoxTypeProvider>()

registerRoutes(server)

server.listen({ port: 3000 })
```

```ts
// routes.ts
import { Type } from '@sinclair/typebox'
import {
  FastifyInstance,
  FastifyBaseLogger,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault
} from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

type FastifyTypebox = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

export function registerRoutes(fastify: FastifyTypebox): void {
  fastify.get('/', {
    schema: {
      body: Type.Object({
        x: Type.String(),
        y: Type.Number(),
        z: Type.Boolean()
      })
    }
  }, (req) => {
    // works
    const { x, y, z } = req.body
  });
}
```
