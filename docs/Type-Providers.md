<h1 align="center">Fastify</h1>

## Type Providers

Type Providers are a TypeScript only feature that enables Fastify to statically infer type information directly from inline JSON Schema. They are an alternative to specifying generic arguments on routes; and can greatly reduce the need to keep associated types for each schema defined in your project.

### Providers

Type Providers are offered as additional packages you will need to install into your project. Each provider uses a different inference library under the hood; allowing you to select the library most appropriate for your needs. Type Provider packages follow a `fastify-type-provider-{provider-name}` naming convention. 

The following inference packages are supported:

- `json-schema-to-ts` - [github](https://github.com/ThomasAribart/json-schema-to-ts)
- `typebox` - [github](https://github.com/sinclairzx81/typebox)

### Json Schema to Ts

The following sets up a `json-schema-to-ts` Type Provider

```bash
$ npm install fastify-type-provider-json-schema-to-ts --save
```

```typescript
import { JsonSchemaToTsTypeProvider } from 'fastify-type-provider-json-schema-to-ts'

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
$ npm install fastify-type-provider-typebox --save
```

```typescript
import { TypeBoxTypeProvider, Type } from 'fastify-type-provider-typebox'

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

TypeBox uses the properties `kind` and `modifier` internally. These properties are not strictly valid JSON schema which will cause `AJV@7` and newer versions to throw an invalid schema error. To remove the error it's either necessary to omit the properties by using [`Type.Strict()`](https://github.com/sinclairzx81/typebox#strict) or use the AJV options for adding custom keywords.

See also the [TypeBox documentation](https://github.com/sinclairzx81/typebox#validation) on how to set up AJV to work with TypeBox.
