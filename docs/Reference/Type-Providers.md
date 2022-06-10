<h1 align="center">Fastify</h1>

## Type Providers

Type Providers are a TypeScript only feature that enables Fastify to statically
infer type information directly from inline JSON Schema. They are an alternative
to specifying generic arguments on routes; and can greatly reduce the need to
keep associated types for each schema defined in your project.

### Providers

Type Providers are offered as additional packages you will need to install into
your project. Each provider uses a different inference library under the hood;
allowing you to select the library most appropriate for your needs. Type
Provider packages follow a `@fastify/type-provider-{provider-name}` naming
convention.

The following inference packages are supported:

- `json-schema-to-ts` -
  [github](https://github.com/ThomasAribart/json-schema-to-ts)
- `typebox` - [github](https://github.com/sinclairzx81/typebox)

### Json Schema to Ts

The following sets up a `json-schema-to-ts` Type Provider

```bash
$ npm i @fastify/type-provider-json-schema-to-ts
```

```typescript
import { JsonSchemaToTsTypeProvider } from '@fastify/type-provider-json-schema-to-ts'

import fastify from 'fastify'

const server = fastify().withTypeProvider<JsonSchemaToTsTypeProvider>()

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
    } as const // don't forget to use const !

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
import { TypeBoxTypeProvider, Type } from '@fastify/type-provider-typebox'

import fastify from 'fastify'

const server = fastify({
    ajv: {
        customOptions: {
            strict: 'log',
            keywords: ['kind', 'modifier'],
        },
    },
}).withTypeProvider<TypeBoxTypeProvider>()

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

TypeBox uses the properties `kind` and `modifier` internally. These properties
are not strictly valid JSON schema which will cause `AJV@7` and newer versions
to throw an invalid schema error. To remove the error it's either necessary to
omit the properties by using
[`Type.Strict()`](https://github.com/sinclairzx81/typebox#strict) or use the AJV
options for adding custom keywords.

See also the [TypeBox
documentation](https://github.com/sinclairzx81/typebox#validation) on how to set
up AJV to work with TypeBox.

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
        } as const
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
dealing with several scopes, see bellow:

```ts
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

const server = Fastify({
    ajv: {
        customOptions: {
            strict: 'log',
            keywords: ['kind', 'modifier'],
        },
    },
}).withTypeProvider<TypeBoxTypeProvider>()

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
    // it doesn't works! in a new scope needs to call `withTypeProvider` again
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

const server = Fastify({
    ajv: {
        customOptions: {
            strict: 'log',
            keywords: ['kind', 'modifier'],
        },
    },
}).withTypeProvider<TypeBoxTypeProvider>()

registerRoutes(server)

server.listen({ port: 3000 })
```

```ts
// routes.ts
import { Type } from '@sinclair/typebox'
import {
  FastifyInstance,
  FastifyLoggerInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault
} from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

type FastifyTypebox = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyLoggerInstance,
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
