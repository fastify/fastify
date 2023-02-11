<h1 align="center">Fastify</h1>

## Validation and Serialization
Fastify uses a schema-based approach, and even if it is not mandatory we
recommend using [JSON Schema](https://json-schema.org/) to validate your routes
and serialize your outputs. Internally, Fastify compiles the schema into a
highly performant function.

Validation will only be attempted if the content type is `application-json`, as
described in the documentation for the [content type
parser](./ContentTypeParser.md).

All the examples in this section are using the [JSON Schema Draft
7](https://json-schema.org/specification-links.html#draft-7) specification.

> ## ⚠  Security Notice
> Treat the schema definition as application code. Validation and serialization
> features dynamically evaluate code with `new Function()`, which is not safe to
> use with user-provided schemas. See [Ajv](https://npm.im/ajv) and
> [fast-json-stringify](https://npm.im/fast-json-stringify) for more details.
>
> Moreover, the [`$async` Ajv
> feature](https://ajv.js.org/guide/async-validation.html) should not be used as
> part of the first validation strategy. This option is used to access Databases
> and reading them during the validation process may lead to Denial of Service
> Attacks to your application. If you need to run `async` tasks, use [Fastify's
> hooks](./Hooks.md) instead after validation completes, such as `preHandler`.


### Core concepts
The validation and the serialization tasks are processed by two different, and
customizable, actors:
- [Ajv v8](https://www.npmjs.com/package/ajv) for the validation of a request
- [fast-json-stringify](https://www.npmjs.com/package/fast-json-stringify) for
  the serialization of a response's body

These two separate entities share only the JSON schemas added to Fastify's
instance through `.addSchema(schema)`.

#### Adding a shared schema
<a id="shared-schema"></a>

Thanks to the `addSchema` API, you can add multiple schemas to the Fastify
instance and then reuse them in multiple parts of your application. As usual,
this API is encapsulated.

The shared schemas can be reused through the JSON Schema
[**`$ref`**](https://tools.ietf.org/html/draft-handrews-json-schema-01#section-8)
keyword. Here is an overview of _how_ references work:

+ `myField: { $ref: '#foo'}` will search for field with `$id: '#foo'` inside the
  current schema
+ `myField: { $ref: '#/definitions/foo'}` will search for field
  `definitions.foo` inside the current schema
+ `myField: { $ref: 'http://url.com/sh.json#'}` will search for a shared schema
  added with `$id: 'http://url.com/sh.json'`
+ `myField: { $ref: 'http://url.com/sh.json#/definitions/foo'}` will search for
  a shared schema added with `$id: 'http://url.com/sh.json'` and will use the
  field `definitions.foo`
+ `myField: { $ref: 'http://url.com/sh.json#foo'}` will search for a shared
  schema added with `$id: 'http://url.com/sh.json'` and it will look inside of
  it for object with `$id: '#foo'`


**Simple usage:**

```js
fastify.addSchema({
  $id: 'http://example.com/',
  type: 'object',
  properties: {
    hello: { type: 'string' }
  }
})

fastify.post('/', {
  handler () {},
  schema: {
    body: {
      type: 'array',
      items: { $ref: 'http://example.com#/properties/hello' }
    }
  }
})
```

**`$ref` as root reference:**

```js
fastify.addSchema({
  $id: 'commonSchema',
  type: 'object',
  properties: {
    hello: { type: 'string' }
  }
})

fastify.post('/', {
  handler () {},
  schema: {
    body: { $ref: 'commonSchema#' },
    headers: { $ref: 'commonSchema#' }
  }
})
```

#### Retrieving the shared schemas
<a id="get-shared-schema"></a>

If the validator and the serializer are customized, the `.addSchema` method will
not be useful since the actors are no longer controlled by Fastify. To access
the schemas added to the Fastify instance, you can simply use `.getSchemas()`:

```js
fastify.addSchema({
  $id: 'schemaId',
  type: 'object',
  properties: {
    hello: { type: 'string' }
  }
})

const mySchemas = fastify.getSchemas()
const mySchema = fastify.getSchema('schemaId')
```

As usual, the function `getSchemas` is encapsulated and returns the shared
schemas available in the selected scope:

```js
fastify.addSchema({ $id: 'one', my: 'hello' })
// will return only `one` schema
fastify.get('/', (request, reply) => { reply.send(fastify.getSchemas()) })

fastify.register((instance, opts, done) => {
  instance.addSchema({ $id: 'two', my: 'ciao' })
  // will return `one` and `two` schemas
  instance.get('/sub', (request, reply) => { reply.send(instance.getSchemas()) })

  instance.register((subinstance, opts, done) => {
    subinstance.addSchema({ $id: 'three', my: 'hola' })
    // will return `one`, `two` and `three`
    subinstance.get('/deep', (request, reply) => { reply.send(subinstance.getSchemas()) })
    done()
  })
  done()
})
```


### Validation
The route validation internally relies upon [Ajv
v8](https://www.npmjs.com/package/ajv) which is a high-performance JSON Schema
validator. Validating the input is very easy: just add the fields that you need
inside the route schema, and you are done!

The supported validations are:
- `body`: validates the body of the request if it is a POST, PUT, or PATCH
  method.
- `querystring` or `query`: validates the query string.
- `params`: validates the route params.
- `headers`: validates the request headers.

All the validations can be a complete JSON Schema object (with a `type` property
of `'object'` and a `'properties'` object containing parameters) or a simpler
variation in which the `type` and `properties` attributes are forgone and the
parameters are listed at the top level (see the example below).

> ℹ If you need to use the latest version of Ajv (v8) you should read how to do
> it in the [`schemaController`](./Server.md#schema-controller) section.

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
  properties: {
    name: { type: 'string' },
    excitement: { type: 'integer' }
  }
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

*Note that Ajv will try to [coerce](https://ajv.js.org/coercion.html) the values
to the types specified in your schema `type` keywords, both to pass the
validation and to use the correctly typed data afterwards.*

The Ajv default configuration in Fastify supports coercing array parameters in
`querystring`. Example:

```js
const opts = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          default: []
        },
      },
    }
  }
}

fastify.get('/', opts, (request, reply) => {
  reply.send({ params: request.query }) // echo the querystring
})

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err
})
```

```sh
curl -X GET "http://localhost:3000/?ids=1

{"params":{"ids":["1"]}}
```

You can also specify a custom schema validator for each parameter type (body,
querystring, params, headers).

For example, the following code disable type coercion only for the `body`
parameters, changing the ajv default options:

```js
const schemaCompilers = {
  body: new Ajv({
    removeAdditional: false,
    coerceTypes: false,
    allErrors: true
  }),
  params: new Ajv({
    removeAdditional: false,
    coerceTypes: true,
    allErrors: true
  }),
  querystring: new Ajv({
    removeAdditional: false,
    coerceTypes: true,
    allErrors: true
  }),
  headers: new Ajv({
    removeAdditional: false,
    coerceTypes: true,
    allErrors: true
  })
}

server.setValidatorCompiler(req => {
    if (!req.httpPart) {
      throw new Error('Missing httpPart')
    }
    const compiler = schemaCompilers[req.httpPart]
    if (!compiler) {
      throw new Error(`Missing compiler for ${req.httpPart}`)
    }
    return compiler.compile(req.schema)
})
```

For further information see [here](https://ajv.js.org/coercion.html)

#### Ajv Plugins
<a id="ajv-plugins"></a>

You can provide a list of plugins you want to use with the default `ajv`
instance. Note that the plugin must be **compatible with the Ajv version shipped
within Fastify**.

> Refer to [`ajv options`](./Server.md#ajv) to check plugins format

```js
const fastify = require('fastify')({
  ajv: {
    plugins: [
      require('ajv-merge-patch')
    ]
  }
})

fastify.post('/', {
  handler (req, reply) { reply.send({ ok: 1 }) },
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
  }
})

fastify.post('/foo', {
  handler (req, reply) { reply.send({ ok: 1 }) },
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
  }
})
```

#### Validator Compiler
<a id="schema-validator"></a>

The `validatorCompiler` is a function that returns a function that validates the
body, URL  parameters, headers, and query string. The default
`validatorCompiler` returns a function that implements the
[ajv](https://ajv.js.org/) validation interface. Fastify uses it internally to
speed the validation up.

Fastify's [baseline ajv
configuration](https://github.com/fastify/ajv-compiler#ajv-configuration) is:

```js
{
  coerceTypes: 'array', // change data type of data to match type keyword
  useDefaults: true, // replace missing properties and items with the values from corresponding default keyword
  removeAdditional: true, // remove additional properties
  uriResolver: require('fast-uri'),
  addUsedSchema: false,
  // Explicitly set allErrors to `false`.
  // When set to `true`, a DoS attack is possible.
  allErrors: false
}
```

This baseline configuration can be modified by providing
[`ajv.customOptions`](./Server.md#factory-ajv) to your Fastify factory.

If you want to change or set additional config options, you will need to create
your own instance and override the existing one like:

```js
const fastify = require('fastify')()
const Ajv = require('ajv')
const ajv = new Ajv({
  removeAdditional: 'all',
  useDefaults: true,
  coerceTypes: 'array',
  // any other options
  // ...
})
fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
  return ajv.compile(schema)
})
```
_**Note:** If you use a custom instance of any validator (even Ajv), you have to
add schemas to the validator instead of Fastify, since Fastify's default
validator is no longer used, and Fastify's `addSchema` method has no idea what
validator you are using._

##### Using other validation libraries
<a id="using-other-validation-libraries"></a>

The `setValidatorCompiler` function makes it easy to substitute `ajv` with
almost any Javascript validation library ([joi](https://github.com/hapijs/joi/),
[yup](https://github.com/jquense/yup/), ...) or a custom one:

```js
const Joi = require('joi')

fastify.post('/the/url', {
  schema: {
    body: Joi.object().keys({
      hello: Joi.string().required()
    }).required()
  },
  validatorCompiler: ({ schema, method, url, httpPart }) => {
    return data => schema.validate(data)
  }
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

fastify.post('/the/url', {
  schema: {
    body: yup.object({
      age: yup.number().integer().required(),
      sub: yup.object().shape({
        name: yup.string().required()
      }).required()
    })
  },
  validatorCompiler: ({ schema, method, url, httpPart }) => {
    return function (data) {
      // with option strict = false, yup `validateSync` function returns the
      // coerced value if validation was successful, or throws if validation failed
      try {
        const result = schema.validateSync(data, yupOptions)
        return { value: result }
      } catch (e) {
        return { error: e }
      }
    }
  }
}, handler)
```

##### .statusCode property

All validation errors will be added a `.statusCode` property set to `400`. This guarantees
that the default error handler will set the status code of the response to `400`.

```js
fastify.setErrorHandler(function (error, request, reply) {
  request.log.error(error, `This error has status code ${error.statusCode}`)
  reply.status(error.statusCode).send(error)
})
```

##### Validation messages with other validation libraries

Fastify's validation error messages are tightly coupled to the default
validation engine: errors returned from `ajv` are eventually run through the
`schemaErrorFormatter` function which is responsible for building human-friendly
error messages. However, the `schemaErrorFormatter` function is written with
`ajv` in mind. As a result, you may run into odd or incomplete error messages
when using other validation libraries.

To circumvent this issue, you have 2 main options :

1. make sure your validation function (returned by your custom `schemaCompiler`)
   returns errors in the same structure and format as `ajv` (although this could
   prove to be difficult and tricky due to differences between validation
   engines)
2. or use a custom `errorHandler` to intercept and format your 'custom'
   validation errors

To help you in writing a custom `errorHandler`, Fastify adds 2 properties to all
validation errors:

* `validation`: the content of the `error` property of the object returned by
  the validation function (returned by your custom `schemaCompiler`)
* `validationContext`: the 'context' (body, params, query, headers) where the
  validation error occurred

A very contrived example of such a custom `errorHandler` handling validation
errors is shown below:

```js
const errorHandler = (error, request, reply) => {
  const statusCode = error.statusCode
  let response

  const { validation, validationContext } = error

  // check if we have a validation error
  if (validation) {
    response = {
      // validationContext will be 'body' or 'params' or 'headers' or 'query'
      message: `A validation error occurred when validating the ${validationContext}...`,
      // this is the result of your validation library...
      errors: validation
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

### Serialization
<a id="serialization"></a>

Usually, you will send your data to the clients as JSON, and Fastify has a
powerful tool to help you,
[fast-json-stringify](https://www.npmjs.com/package/fast-json-stringify), which
is used if you have provided an output schema in the route options. We encourage
you to use an output schema, as it can drastically increase throughput and help
prevent accidental disclosure of sensitive information.

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

As you can see, the response schema is based on the status code. If you want to
use the same schema for multiple status codes, you can use `'2xx'` or `default`,
for example:
```js
const schema = {
  response: {
    default: {
      type: 'object',
      properties: {
        error: {
          type: 'boolean',
          default: true
        }
      }
    },
    '2xx': {
      type: 'object',
      properties: {
        value: { type: 'string' },
        otherValue: { type: 'boolean' }
      }
    },
    201: {
      // the contract syntax
      value: { type: 'string' }
    }
  }
}

fastify.post('/the/url', { schema }, handler)
```
You can even have a specific response schema for different content types.
For example:
```js
const schema = {
      response: {
        200: {
          description: 'Response schema that support different content types'
          content: {
            'application/json': {
              schema: {
                name: { type: 'string' },
                image: { type: 'string' },
                address: { type: 'string' }
              }
            },
            'application/vnd.v1+json': {
              schema: {
                type: 'array',
                items: { $ref: 'test' }
              }
            }
          }
        },
        '3xx': {
          content: {
            'application/vnd.v2+json': {
              schema: {
                fullName: { type: 'string' },
                phone: { type: 'string' }
              }
            }
          }
        }
      }
    }

fastify.post('/url', { schema }, handler)
```

#### Serializer Compiler
<a id="schema-serializer"></a>

The `serializerCompiler` is a function that returns a function that must return
a string from an input object. When you define a response JSON Schema, you can
change the default serialization method by providing a function to serialize
every route where you do.

```js
fastify.setSerializerCompiler(({ schema, method, url, httpStatus, contentType }) => {
  return data => JSON.stringify(data)
})

fastify.get('/user', {
  handler (req, reply) {
    reply.send({ id: 1, name: 'Foo', image: 'BIG IMAGE' })
  },
  schema: {
    response: {
      '2xx': {
        id: { type: 'number' },
        name: { type: 'string' }
      }
    }
  }
})
```

*If you need a custom serializer in a very specific part of your code, you can
set one with [`reply.serializer(...)`](./Reply.md#serializerfunc).*

### Error Handling
When schema validation fails for a request, Fastify will automatically return a
status 400 response including the result from the validator in the payload. As
an example, if you have the following schema for your route

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

and fail to satisfy it, the route will immediately return a response with the
following payload

```js
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "body should have required property 'name'"
}
```

If you want to handle errors inside the route, you can specify the
`attachValidation` option for your route. If there is a _validation error_, the
`validationError` property of the request will contain the `Error` object with
the raw `validation` result as shown below

```js
const fastify = Fastify()

fastify.post('/', { schema, attachValidation: true }, function (req, reply) {
  if (req.validationError) {
    // `req.validationError.validation` contains the raw validation error
    reply.code(400).send(req.validationError)
  }
})
```

#### `schemaErrorFormatter`

If you want to format errors yourself, you can provide a sync function that must
return an error as the `schemaErrorFormatter` option to Fastify when
instantiating. The context function will be the Fastify server instance.

`errors` is an array of Fastify schema errors `FastifySchemaValidationError`.
`dataVar` is the currently validated part of the schema. (params | body |
querystring | headers).

```js
const fastify = Fastify({
  schemaErrorFormatter: (errors, dataVar) => {
    // ... my formatting logic
    return new Error(myErrorMessage)
  }
})

// or
fastify.setSchemaErrorFormatter(function (errors, dataVar) {
  this.log.error({ err: errors }, 'Validation failed')
  // ... my formatting logic
  return new Error(myErrorMessage)
})
```

You can also use [setErrorHandler](./Server.md#seterrorhandler) to define a
custom response for validation errors such as

```js
fastify.setErrorHandler(function (error, request, reply) {
  if (error.validation) {
     reply.status(422).send(new Error('validation failed'))
  }
})
```

If you want a custom error response in the schema without headaches, and
quickly, take a look at
[`ajv-errors`](https://github.com/epoberezkin/ajv-errors). Check out the
[example](https://github.com/fastify/example/blob/HEAD/validation-messages/custom-errors-messages.js)
usage.
> Make sure to install version 1.0.1 of `ajv-errors`, because later versions of
> it are not compatible with AJV v6 (the version shipped by Fastify v3).

Below is an example showing how to add **custom error messages for each
property** of a schema by supplying custom AJV options. Inline comments in the
schema below describe how to configure it to show a different error message for
each case:

```js
const fastify = Fastify({
  ajv: {
    customOptions: {
      jsonPointers: true,
      // Warning: Enabling this option may lead to this security issue https://www.cvedetails.com/cve/CVE-2020-8192/
      allErrors: true
    },
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

If you want to return localized error messages, take a look at
[ajv-i18n](https://github.com/epoberezkin/ajv-i18n)

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

### JSON Schema support

JSON Schema provides utilities to optimize your schemas that, in conjunction
with Fastify's shared schema, let you reuse all your schemas easily.

| Use Case                          | Validator | Serializer |
|-----------------------------------|-----------|------------|
| `$ref` to `$id`                   | ️️✔️ | ✔️ |
| `$ref` to `/definitions`          | ✔️ | ✔️ |
| `$ref` to shared schema `$id`          | ✔️ | ✔️ |
| `$ref` to shared schema `/definitions` | ✔️ | ✔️ |

#### Examples

##### Usage of `$ref` to `$id` in same JSON Schema

```js
const refToId = {
  type: 'object',
  definitions: {
    foo: {
      $id: '#address',
      type: 'object',
      properties: {
        city: { type: 'string' }
      }
    }
  },
  properties: {
    home: { $ref: '#address' },
    work: { $ref: '#address' }
  }
}
```


##### Usage of `$ref` to `/definitions` in same JSON Schema
```js
const refToDefinitions = {
  type: 'object',
  definitions: {
    foo: {
      $id: '#address',
      type: 'object',
      properties: {
        city: { type: 'string' }
      }
    }
  },
  properties: {
    home: { $ref: '#/definitions/foo' },
    work: { $ref: '#/definitions/foo' }
  }
}
```

##### Usage `$ref` to a shared schema `$id` as external schema
```js
fastify.addSchema({
  $id: 'http://foo/common.json',
  type: 'object',
  definitions: {
    foo: {
      $id: '#address',
      type: 'object',
      properties: {
        city: { type: 'string' }
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

##### Usage `$ref` to a shared schema `/definitions` as external schema
```js
fastify.addSchema({
  $id: 'http://foo/shared.json',
  type: 'object',
  definitions: {
    foo: {
      type: 'object',
      properties: {
        city: { type: 'string' }
      }
    }
  }
})

const refToSharedSchemaDefinitions = {
  type: 'object',
  properties: {
    home: { $ref: 'http://foo/shared.json#/definitions/foo' },
    work: { $ref: 'http://foo/shared.json#/definitions/foo' }
  }
}
```

### Resources
<a id="resources"></a>

- [JSON Schema](https://json-schema.org/)
- [Understanding JSON
  Schema](https://spacetelescope.github.io/understanding-json-schema/)
- [fast-json-stringify
  documentation](https://github.com/fastify/fast-json-stringify)
- [Ajv documentation](https://github.com/epoberezkin/ajv/blob/master/README.md)
- [Ajv i18n](https://github.com/epoberezkin/ajv-i18n)
- [Ajv custom errors](https://github.com/epoberezkin/ajv-errors)
- Custom error handling with core methods with error file dumping
  [example](https://github.com/fastify/example/tree/master/validation-messages)
