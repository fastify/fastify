<h1 align="center">Fastify</h1>

## Validation and Serialization
Fastify uses a schema-based approach, and even if it is not mandatory we recommend using [JSON Schema](http://json-schema.org/) to validate your routes and serialize your outputs. Internally, Fastify compiles the schema into a highly performant function.

> ## ⚠  Security Notice
> Treat the schema definition as application code.
> As both validation and serialization features dynamically evaluate
> code with `new Function()`, it is not safe to use
> user-provided schemas. See [Ajv](http://npm.im/ajv) and
> [fast-json-stringify](http://npm.im/fast-json-stringify) for more
> details.

<a name="validation"></a>
### Validation
The route validation internally relies upon [Ajv](https://www.npmjs.com/package/ajv), which is a high-performance JSON schema validator. Validating the input is very easy: just add the fields that you need inside the route schema, and you are done! The supported validations are:
- `body`: validates the body of the request if it is a POST or a PUT.
- `querystring` or `query`: validates the query string. This can be a complete JSON Schema object (with a `type` property of `'object'` and a `'properties'` object containing parameters) or a simpler variation in which the `type` and `properties` attributes are forgone and the query parameters are listed at the top level (see the example below).
- `params`: validates the route params.
- `headers`: validates the request headers.

Example:
```js
const bodyJsonSchema = {
  type: 'object',
  required: ['requiredKey'],
  properties: {
    someKey: { type: 'string' },
    someOtherKey: { type: 'number' },
    requiredKey: {
      type: 'array',
      maxItems: 3,
      items: { type: 'integer' }
    },
    nullableKey: { type: ['number', 'null'] }, // or { type: 'number', nullable: true }
    multipleTypesKey: { type: ['boolean', 'number'] },
    multipleRestrictedTypesKey: {
      oneOf: [
        { type: 'string', maxLength: 5 },
        { type: 'number', minimum: 10 }
      ]
    },
    enumKey: {
      type: 'string',
      enum: ['John', 'Foo']
    },
    notTypeKey: {
      not: { type: 'array' }
    }
  }
}

const queryStringJsonSchema = {
  name: { type: 'string' },
  excitement: { type: 'integer' }
}

const paramsJsonSchema = {
  type: 'object',
  properties: {
    par1: { type: 'string' },
    par2: { type: 'number' }
  }
}

const headersJsonSchema = {
  type: 'object',
  properties: {
    'x-foo': { type: 'string' }
  },
  required: ['x-foo']
}

const schema = {
  body: bodyJsonSchema,

  querystring: queryStringJsonSchema,

  params: paramsJsonSchema,

  headers: headersJsonSchema
}

fastify.post('/the/url', { schema }, handler)
```
*Note that Ajv will try to [coerce](https://github.com/epoberezkin/ajv#coercing-data-types) the values to the types specified in your schema `type` keywords, both to pass the validation and to use the correctly typed data afterwards.*

<a name="shared-schema"></a>
#### Adding a shared schema
Thanks to the `addSchema` API, you can add multiple schemas to the Fastify instance and then reuse them in multiple parts of your application. As usual, this API is encapsulated.

There are two ways to reuse your shared schemas:
+ **`$ref-way`**: as described in the [standard](https://tools.ietf.org/html/draft-handrews-json-schema-01#section-8),
you can refer to an external schema. To use it you have to `addSchema` with a valid `$id` absolute URI.
+ **`replace-way`**: this is a Fastify utility that lets you to substitute some fields with a shared schema.
To use it you have to `addSchema` with an `$id` having a relative URI fragment which is a simple string that
applies only to alphanumeric chars `[A-Za-z0-9]`.

Here an overview on _how_ to set an `$id` and _how_ references to it:

+ `replace-way`
  + `myField: 'foobar#'` will search for a shared schema added with `$id: 'foobar'`
+ `$ref-way`
  + `myField: { $ref: '#foo'}` will search for field with `$id: '#foo'` inside the current schema
  + `myField: { $ref: '#/definitions/foo'}` will search for field `definitions.foo` inside the current schema
  + `myField: { $ref: 'http://url.com/sh.json#'}` will search for a shared schema added with `$id: 'http://url.com/sh.json'`
  + `myField: { $ref: 'http://url.com/sh.json#/definitions/foo'}` will search for a shared schema added with `$id: 'http://url.com/sh.json'` and will use the field `definitions.foo`
  + `myField: { $ref: 'http://url.com/sh.json#foo'}` will search for a shared schema added with `$id: 'http://url.com/sh.json'` and it will look inside of it for object with `$id: '#foo'`


More examples:

**`$ref-way`** usage examples:

```js
fastify.addSchema({
  $id: 'http://example.com/common.json',
  type: 'object',
  properties: {
    hello: { type: 'string' }
  }
})

fastify.route({
  method: 'POST',
  url: '/',
  schema: {
    body: {
      type: 'array',
      items: { $ref: 'http://example.com/common.json#/properties/hello' }
    }
  },
  handler: () => {}
})
```

**`replace-way`** usage examples:

```js
const fastify = require('fastify')()

fastify.addSchema({
  $id: 'greetings',
  type: 'object',
  properties: {
    hello: { type: 'string' }
  }
})

fastify.route({
  method: 'POST',
  url: '/',
  schema: {
    body: 'greetings#'
  },
  handler: () => {}
})

fastify.register((instance, opts, done) => {

  /**
   * In children's scope can use schemas defined in upper scope like 'greetings'.
   * Parent scope can't use the children schemas.
   */
  instance.addSchema({
    $id: 'framework',
    type: 'object',
    properties: {
      fastest: { type: 'string' },
      hi: 'greetings#'
    }
  })

  instance.route({
    method: 'POST',
    url: '/sub',
    schema: {
      body: 'framework#'
    },
    handler: () => {}
  })

  done()
})
```

You can use the shared schema everywhere, as top level schema or nested inside other schemas:
```js
const fastify = require('fastify')()

fastify.addSchema({
  $id: 'greetings',
  type: 'object',
  properties: {
    hello: { type: 'string' }
  }
})

fastify.route({
  method: 'POST',
  url: '/',
  schema: {
    body: {
      type: 'object',
      properties: {
        greeting: 'greetings#',
        timestamp: { type: 'number' }
      }
    }
  },
  handler: () => {}
})
```

<a name="get-shared-schema"></a>
#### Retrieving a copy of shared schemas

The function `getSchemas` returns the shared schemas available in the selected scope:
```js
fastify.addSchema({ $id: 'one', my: 'hello' })
fastify.get('/', (request, reply) => { reply.send(fastify.getSchemas()) })

fastify.register((instance, opts, done) => {
  instance.addSchema({ $id: 'two', my: 'ciao' })
  instance.get('/sub', (request, reply) => { reply.send(instance.getSchemas()) })

  instance.register((subinstance, opts, done) => {
    subinstance.addSchema({ $id: 'three', my: 'hola' })
    subinstance.get('/deep', (request, reply) => { reply.send(subinstance.getSchemas()) })
    done()
  })
  done()
})
```
This example will returns:

|  URL  | Schemas |
|-------|---------|
| /     | one             |
| /sub  | one, two        |
| /deep | one, two, three |

<a name="schema-compiler"></a>
#### Schema Compiler

The `schemaCompiler` is a function that returns a function that validates the body, url parameters, headers, and query string. The default `schemaCompiler` returns a function that implements the [ajv](https://ajv.js.org/) validation interface. Fastify uses it internally to speed the validation up.

Fastify's [baseline ajv configuration](https://github.com/epoberezkin/ajv#options-to-modify-validated-data) is:

```js
{
  removeAdditional: true, // remove additional properties
  useDefaults: true, // replace missing properties and items with the values from corresponding default keyword
  coerceTypes: true, // change data type of data to match type keyword
  allErrors: true,   // check for all errors
  nullable: true     // support keyword "nullable" from Open API 3 specification.
}
```

This baseline configuration cannot be modified. If you want to change or set additional config options, you will need to create your own instance and override the existing one like:

```js
const fastify = require('fastify')()
const Ajv = require('ajv')
const ajv = new Ajv({
  // the fastify defaults (if needed)
  removeAdditional: true,
  useDefaults: true,
  coerceTypes: true,
  allErrors: true,
  nullable: true,
  // any other options
  // ...
})
fastify.setSchemaCompiler(function (schema) {
  return ajv.compile(schema)
})

// -------
// Alternatively, you can set the schema compiler using the setter property:
fastify.schemaCompiler = function (schema) { return ajv.compile(schema) })
```

But maybe you want to change the validation library. Perhaps you like `Joi`. In this case, you can use it to validate the url parameters, body, and query string!

```js
const Joi = require('joi')

fastify.post('/the/url', {
  schema: {
    body: Joi.object().keys({
      hello: Joi.string().required()
    }).required()
  },
  schemaCompiler: schema => data => Joi.validate(data, schema)
}, handler)
```

In that case the function returned by `schemaCompiler` returns an object like:
* `error`: filled with an instance of `Error` or a string that describes the validation error
* `value`: the coerced value that passed the validation

<a name="serialization"></a>
### Serialization
Usually you will send your data to the clients via JSON, and Fastify has a powerful tool to help you, [fast-json-stringify](https://www.npmjs.com/package/fast-json-stringify), which is used if you have provided an output schema in the route options. We encourage you to use an output schema, as it will increase your throughput by 100-400% depending on your payload and will prevent accidental disclosure of sensitive information.

Example:
```js
const schema = {
  response: {
    200: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        otherValue: { type: 'boolean' }
      }
    }
  }
}

fastify.post('/the/url', { schema }, handler)
```

As you can see, the response schema is based on the status code. If you want to use the same schema for multiple status codes, you can use `'2xx'`, for example:
```js
const schema = {
  response: {
    '2xx': {
      type: 'object',
      properties: {
        value: { type: 'string' },
        otherValue: { type: 'boolean' }
      }
    },
    201: {
      type: 'object',
      properties: {
        value: { type: 'string' }
      }
    }
  }
}

fastify.post('/the/url', { schema }, handler)
```

*If you need a custom serializer in a very specific part of your code, you can set one with `reply.serializer(...)`.*

### Error Handling
When schema validation fails for a request, Fastify will automtically return a  status 400 response including the result from the validator in the payload. As an example, if you have the following schema for your route

```js
const schema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' }
    },
    required: ['name']
  }
}
```

and fail to satisfy it, the route will immediately return a response with the following payload

```js
{ 
  "statusCode": 400,
  "error": "Bad Request",
  "message": "body should have required property 'name'" 
}
```

If you want to handle errors inside the route, you can specify the `attachValidation` option for your route. If there is a validation error, the `validationError` property of the request will contain the `Error` object with the raw `validation` result as shown below

```js
const fastify = Fastify()

fastify.post('/', { schema, attachValidation: true }, function (req, reply) {
  if (req.validationError) {
    // `req.validationError.validation` contains the raw validation error
    reply.code(400).send(req.validationError)
  }
})
```

You can also use [setErrorHandler](https://www.fastify.io/docs/latest/Server/#seterrorhandler) to define a custom response for validation errors such as

```js
fastify.setErrorHandler(function (error, request, reply) {
  if (error.validation) {
     reply.status(422).send(new Error('validation failed'))
  }
})
```

If you want custom error response in schema without headaches and quickly, you can take a look at [here](https://github.com/epoberezkin/ajv-errors)

### JSON Schema and Shared Schema support

JSON Schema has some type of utilities in order to optimize your schemas that,
in conjuction with the Fastify's shared schema, let you reuse all your schemas easily.

| Use Case                          | Validator | Serializer |
|-----------------------------------|-----------|------------|
| shared schema                     | ✔️ | ✔️ |
| `$ref` to `$id`                   | ️️✔️ | ✔️ |
| `$ref` to `/definitions`          | ✔️ | ✔️ |
| `$ref` to shared schema `$id`          | ✔️ | ✔️ |
| `$ref` to shared schema `/definitions` | ✔️ | ✔️ |

#### Examples

```js
// Usage of the Shared Schema feature
fastify.addSchema({
  $id: 'sharedAddress',
  type: 'object',
  properties: {
    city: { 'type': 'string' }
  }
})

const sharedSchema = {
  type: 'object',
  properties: {
    home: 'sharedAddress#',
    work: 'sharedAddress#'
  }
}
```

```js
// Usage of $ref to $id in same JSON Schema
const refToId = {
  type: 'object',
  definitions: {
    foo: {
      $id: '#address',
      type: 'object',
      properties: {
        city: { 'type': 'string' }
      }
    }
  },
  properties: {
    home: { $ref: '#address' },
    work: { $ref: '#address' }
  }
}
```


```js
// Usage of $ref to /definitions in same JSON Schema
const refToDefinitions = {
  type: 'object',
  definitions: {
    foo: {
      $id: '#address',
      type: 'object',
      properties: {
        city: { 'type': 'string' }
      }
    }
  },
  properties: {
    home: { $ref: '#/definitions/foo' },
    work: { $ref: '#/definitions/foo' }
  }
}
```

```js
// Usage $ref to a shared schema $id as external schema
fastify.addSchema({
  $id: 'http://foo/common.json',
  type: 'object',
  definitions: {
    foo: {
      $id: '#address',
      type: 'object',
      properties: {
        city: { 'type': 'string' }
      }
    }
  }
})

const refToSharedSchemaId = {
  type: 'object',
  properties: {
    home: { $ref: 'http://foo/common.json#address' },
    work: { $ref: 'http://foo/common.json#address' }
  }
}
```


```js
// Usage $ref to a shared schema /definitions as external schema
fastify.addSchema({
  $id: 'http://foo/common.json',
  type: 'object',
  definitions: {
    foo: {
      type: 'object',
      properties: {
        city: { 'type': 'string' }
      }
    }
  }
})

const refToSharedSchemaDefinitions = {
  type: 'object',
  properties: {
    home: { $ref: 'http://foo/common.json#/definitions/foo' },
    work: { $ref: 'http://foo/common.json#/definitions/foo' }
  }
}
```

<a name="resources"></a>
### Resources
- [JSON Schema](http://json-schema.org/)
- [Understanding JSON schema](https://spacetelescope.github.io/understanding-json-schema/)
- [fast-json-stringify documentation](https://github.com/fastify/fast-json-stringify)
- [Ajv documentation](https://github.com/epoberezkin/ajv/blob/master/README.md)
- [Ajv i18n](https://github.com/epoberezkin/ajv-i18n)
- [Ajv custom errors](https://github.com/epoberezkin/ajv-errors)
- Custom error handling with core methods with error file dumping [example](https://github.com/fastify/example/tree/master/validation-messages)
