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
- `body`: validates the body of the request if it is a POST, a PATCH or a PUT.
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
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string' },
    excitement: { type: 'integer' }
  }
}

/* If you don't need required query strings,
 * A short hand syntax is also there:

const queryStringJsonSchema = {
  name: { type: 'string' },
  excitement: { type: 'integer' }
}

*/


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

<a name="ajv-plugins"></a>
#### Ajv Plugins

You can provide a list of plugins you want to use with Ajv:

> Refer to [`ajv options`](https://github.com/fastify/fastify/blob/master/docs/Server.md#factory-ajv) to check plugins format

```js
const fastify = require('fastify')({
  ajv: {
    plugins: [
      require('ajv-merge-patch')
    ]
  }
})

fastify.route({
  method: 'POST',
  url: '/',
  schema: {
    body: {
      $patch: {
        source: {
          type: 'object',
          properties: {
            q: {
              type: 'string'
            }
          }
        },
        with: [
          {
            op: 'add',
            path: '/properties/q',
            value: { type: 'number' }
          }
        ]
      }
    }
  },
  handler (req, reply) {
    reply.send({ ok: 1 })
  }
})

fastify.route({
  method: 'POST',
  url: '/',
  schema: {
    body: {
      $merge: {
        source: {
          type: 'object',
          properties: {
            q: {
              type: 'string'
            }
          }
        },
        with: {
          required: ['q']
        }
      }
    }
  },
  handler (req, reply) {
    reply.send({ ok: 1 })
  }
})
```

<a name="schema-compiler"></a>
#### Schema Compiler

The `schemaCompiler` is a function that returns a function that validates the body, url parameters, headers, and query string. The default `schemaCompiler` returns a function that implements the [ajv](https://ajv.js.org/) validation interface. Fastify uses it internally to speed the validation up.

Fastify's [baseline ajv configuration](https://github.com/epoberezkin/ajv#options-to-modify-validated-data) is:

```js
{
  removeAdditional: true, // remove additional properties
  useDefaults: true, // replace missing properties and items with the values from corresponding default keyword
  coerceTypes: true, // change data type of data to match type keyword
  nullable: true     // support keyword "nullable" from Open API 3 specification.
}
```

This baseline configuration can be modified by providing [`ajv.customOptions`](https://github.com/fastify/fastify/blob/master/docs/Server.md#factory-ajv) to your Fastify factory.

If you want to change or set additional config options, you will need to create your own instance and override the existing one like:

```js
const fastify = require('fastify')()
const Ajv = require('ajv')
const ajv = new Ajv({
  // the fastify defaults (if needed)
  removeAdditional: true,
  useDefaults: true,
  coerceTypes: true,
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
_**Note:** If you use a custom instance of any validator (even Ajv), you have to add schemas to the validator instead of fastify, since fastify's default validator is no longer used, and fastify's `addSchema` method has no idea what validator you are using._

<a name="using-other-validation-libraries"></a>
#### Using other validation libraries

The `schemaCompiler` function makes it easy to substitute `ajv` with almost any Javascript validation library ([joi](https://github.com/hapijs/joi/), [yup](https://github.com/jquense/yup/), ...).

However, in order to make your chosen validation engine play well with Fastify's request/response pipeline, the function returned by your `schemaCompiler` function should return an object with either :

* in case of validation failure: an `error` property, filled with an instance of `Error` or a string that describes the validation error
* in case of validation success: an `value` property, filled with the coerced value that passed the validation

The examples below are therefore equivalent:

```js
const joi = require('joi')

// Validation options to match ajv's baseline options used in Fastify
const joiOptions = {
  abortEarly: false, // return all errors
  convert: true, // change data type of data to match type keyword
  allowUnknown : false, // remove additional properties
  noDefaults: false
}

const joiBodySchema = joi.object().keys({
  age: joi.number().integer().required(),
  sub: joi.object().keys({
    name: joi.string().required()
  }).required()
})

const joiSchemaCompiler = schema => data => {
  // joi `validate` function returns an object with an error property (if validation failed) and a value property (always present, coerced value if validation was successful)
  const { error, value } = joiSchema.validate(data, joiOptions)
  if (error) {
    return { error }
  } else {
    return { value }
  }
}

// or more simply...
const joiSchemaCompiler = schema => data => joiSchema.validate(data, joiOptions)

fastify.post('/the/url', {
  schema: {
    body: joiBodySchema
  },
  schemaCompiler: joiSchemaCompiler
}, handler)
```

```js
const yup = require('yup')

// Validation options to match ajv's baseline options used in Fastify
const yupOptions = {
  strict: false,
  abortEarly: false, // return all errors
  stripUnknown: true, // remove additional properties
  recursive: true
}

const yupBodySchema = yup.object({
  age: yup.number().integer().required(),
  sub: yup.object().shape({
    name: yup.string().required()
  }).required()
})

const yupSchemaCompiler = schema => data => {
  // with option strict = false, yup `validateSync` function returns the coerced value if validation was successful, or throws if validation failed
  try {
    const result = schema.validateSync(data, yupOptions)
    return { value: result }
  } catch (e) {
    return { error: e }
  }
}

fastify.post('/the/url', {
  schema: {
    body: yupBodySchema
  },
  schemaCompiler: yupSchemaCompiler
}, handler)
```

##### Validation messages with other validation libraries

Fastify's validation error messages are tightly coupled to the default validation engine: errors returned from `ajv` are eventually run through the `schemaErrorsText` function which is responsible for building human-friendly error messages. However, the `schemaErrorsText` function is written with `ajv` in mind : as a result, you may run into odd or incomplete error messages when using other validation librairies.

To circumvent this issue, you have 2 main options :

1. make sure your validation function (returned by your custom `schemaCompiler`) returns errors in the exact same structure and format as `ajv` (although this could prove to be difficult and tricky due to differences between validation engines)
2. or use a custom `errorHandler` to intercept and format your 'custom' validation errors

To help you in writing a custom `errorHandler`, Fastify adds 2 properties to all validation errors:

* validation: the content of the `error` property of the object returned by the validation function (returned by your custom `schemaCompiler`)
* validationContext: the 'context' (body, params, query, headers) where the validation error occurred

A very contrived example of such a custom `errorHandler` handling validation errors is shown below:

```js
const errorHandler = (error, request, reply) => {

  const statusCode = error.statusCode
  let response

  const { validation, validationContext } = error

  // check if we have a validation error
  if (validation) {
    response = {
      message: `A validation error occured when validating the ${validationContext}...`, // validationContext will be 'body' or 'params' or 'headers' or 'query'
      errors: validation // this is the result of your validation library...
    }
  } else {
    response = {
      message: 'An error occurred...'
    }
  }

  // any additional work here, eg. log error
  // ...

  reply.status(statusCode).send(response)

}
```

<a name="schema-resolver"></a>
#### Schema Resolver

The `schemaResolver` is a function that works together with the `schemaCompiler`: you can't use it
with the default schema compiler. This feature is useful when you use complex schemas with `$ref` keyword
in your routes and a custom validator.

This is needed because all the schemas you add to your custom compiler are unknown to Fastify but it
need to resolve the `$ref` paths.

```js
const fastify = require('fastify')()
const Ajv = require('ajv')
const ajv = new Ajv()

ajv.addSchema({
  $id: 'urn:schema:foo',
  definitions: {
    foo: { type: 'string' }
  },
  type: 'object',
  properties: {
    foo: { $ref: '#/definitions/foo' }
  }
})
ajv.addSchema({
  $id: 'urn:schema:response',
  type: 'object',
  required: ['foo'],
  properties: {
    foo: { $ref: 'urn:schema:foo#/definitions/foo' }
  }
})
ajv.addSchema({
  $id: 'urn:schema:request',
  type: 'object',
  required: ['foo'],
  properties: {
    foo: { $ref: 'urn:schema:foo#/definitions/foo' }
  }
})

fastify.setSchemaCompiler(schema => ajv.compile(schema))
fastify.setSchemaResolver((ref) => {
  return ajv.getSchema(ref).schema
})

fastify.route({
  method: 'POST',
  url: '/',
  schema: {
    body: { $ref: 'urn:schema:request#' },
    response: {
      '2xx': { $ref: 'urn:schema:response#' }
    }
  },
  handler (req, reply) {
    reply.send({ foo: 'bar' })
  }
})
```

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
     // error.validationContext can be on of [body, params, querystring, headers]
     reply.status(422).send(new Error(`validation failed of the ${error.validationContext}`))
  }
})
```

If you want custom error response in schema without headaches and quickly, you can take a look at [`ajv-errors`](https://github.com/epoberezkin/ajv-errors). Checkout the [example](https://github.com/fastify/example/blob/master/validation-messages/custom-errors-messages.js) usage.

Below is an example showing how to add **custom error messages for each property** of a schema by supplying custom AJV options.
Inline comments in the schema below describe how to configure it to show a different error message for each case:

```js
const fastify = Fastify({
  ajv: {
    customOptions: { jsonPointers: true },
    plugins: [
      require('ajv-errors')
    ]
  }
})

const schema = {
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        errorMessage: {
          type: 'Bad name'
        }
      },
      age: {
        type: 'number',
        errorMessage: {
          type: 'Bad age', // specify custom message for
          min: 'Too young' // all constraints except required
        }
      }
    },
    required: ['name', 'age'],
    errorMessage: {
      required: {
        name: 'Why no name!', // specify error message for when the
        age: 'Why no age!' // property is missing from input
      }
    }
  }
}

fastify.post('/', { schema, }, (request, reply) => {
  reply.send({
    hello: 'world'
  })
})
```

If you want to return localized error messages, take a look at [ajv-i18n](https://github.com/epoberezkin/ajv-i18n)

```js
const localize = require('ajv-i18n')

const fastify = Fastify()

const schema = {
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
      age: {
        type: 'number',
      }
    },
    required: ['name', 'age'],
  }
}

fastify.setErrorHandler(function (error, request, reply) {
  if (error.validation) {
    localize.ru(error.validation)
    reply.status(400).send(error.validation)
    return
  }
  reply.send(error)
})
```

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
