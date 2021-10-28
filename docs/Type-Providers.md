<h1 align="center">Fastify</h1>

## Type Providers

Type Providers are a TypeScript only feature that enables Fastify to statically infer type information directly from inline JSON Schema. They are an alternative to using generic arguments on routes; and can greatly reduce the need to keep associated types for each schema defined in your project.

### Providers

Type Providers are offered as additional plugins you will need to install into your project. Each provider uses a different inference library under the hood; allowing you to select the library most appropriate for your needs.

The following inference libraries are supported:

- `json-schema-to-ts` - [github](https://github.com/ThomasAribart/json-schema-to-ts)
- `typebox` - [github](https://github.com/sinclairzx81/typebox)

### Json Schema to Js

The following sets up a `json-schema-to-ts` Type Provider

```bash
$ npm install fastify-json-schema-to-ts-type-provider --save
```

```typescript
import { JsonSchemaToTsTypeProvider } from 'fastify-json-schema-to-ts-type-provider'

import fastify from 'fastify'

const server = fastify().typeProvider<JsonSchemaToTsTypeProvider>()

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
$ npm install fastify-typebox-type-provider --save
```

```typescript
import { TypeBoxTypeProvider, Type } from 'fastify-typebox-type-provider'

import fastify from 'fastify'

const server = fastify().typeProvider<TypeBoxTypeProvider>()

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
