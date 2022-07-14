<h1 align="center">Fastify</h1>

## Request
The first parameter of the handler function is `Request`.

Request is a core Fastify object containing the following fields:
- `query` - the parsed querystring, its format is specified by
  [`querystringParser`](./Server.md#querystringparser)
- `body` - the request payload, see [Content-Type
  Parser](./ContentTypeParser.md) for details on what request payloads Fastify
  natively parses and how to support other content types
- `params` - the params matching the URL
- [`headers`](#headers) - the headers getter and setter
- `raw` - the incoming HTTP request from Node core
- `server` - The Fastify server instance, scoped to the current [encapsulation
  context](./Encapsulation.md)
- `id` - the request ID
- `log` - the logger instance of the incoming request
- `ip` - the IP address of the incoming request
- `ips` - an array of the IP addresses, ordered from closest to furthest, in the
  `X-Forwarded-For` header of the incoming request (only when the
  [`trustProxy`](./Server.md#factory-trust-proxy) option is enabled)
- `hostname` - the host of the incoming request (derived from `X-Forwarded-Host`
  header when the [`trustProxy`](./Server.md#factory-trust-proxy) option is
  enabled). For HTTP/2 compatibility it returns `:authority` if no host header
  exists.
- `protocol` - the protocol of the incoming request (`https` or `http`)
- `method` - the method of the incoming request
- `url` - the URL of the incoming request
- `routerMethod` - the method defined for the router that is handling the
  request
- `routerPath` - the path pattern defined for the router that is handling the
  request
- `is404` - true if request is being handled by 404 handler, false if it is not
- `connection` - Deprecated, use `socket` instead. The underlying connection of
  the incoming request.
- `socket` - the underlying connection of the incoming request
- [.getValidationFunction(schema | httpPart)](#getvalidationfunction) - 
  Returns a validation function for the specified schema or http part,
  if any of either are set or cached.
- [.compileValidationSchema(schema, [httpPart])](#compilevalidationschema) -
  Compiles the specified schema and returns a validation function
  using the default (or customized) `ValidationCompiler`.
  The optional `httpPart` is forwarded to the `ValidationCompiler`
  if provided, default to `null`.
- [.validate(data, schema | httpPart, [httpPart])](#validate) -
  Validates the specified input by using the specified
  schema and returns the serialized payload. If the optional
  `httpPart` is provided, the function will use the serializer
  function given for that HTTP Status Code. Default to `null`.
- `context` - A Fastify internal object. You should not use it directly or
  modify it. It is useful to access one special key:
  - `context.config` - The route [`config`](./Routes.md#routes-config) object.

### Headers

The `request.headers` is a getter that returns an Object with the headers of the
incoming request. You can set custom headers like this:

```js
request.headers = {
  'foo': 'bar',
  'baz': 'qux'
}
```

This operation will add to the request headers the new values that can be read
calling `request.headers.bar`. Moreover, you can still access the standard
request's headers with the `request.raw.headers` property.

> Note: For performance reason on `not found` route, you may see that we will
add an extra property `Symbol('fastify.RequestAcceptVersion')` on the headers.

```js
fastify.post('/:params', options, function (request, reply) {
  console.log(request.body)
  console.log(request.query)
  console.log(request.params)
  console.log(request.headers)
  console.log(request.raw)
  console.log(request.server)
  console.log(request.id)
  console.log(request.ip)
  console.log(request.ips)
  console.log(request.hostname)
  console.log(request.protocol)
  console.log(request.url)
  console.log(request.routerMethod)
  console.log(request.routerPath)
  request.log.info('some info')
})
```
### .getValidationFunction(schema | httpPart)
<a id="getvalidationfunction"></a>

By calling this function using a provided `schema` or `httpPart`, 
it will return a `validation` function that can be used to
validate diverse inputs. It returns `undefined` if no
serialization function was found using either of the provided inputs.

```js
const validate = request
                  .getValidationFunction({
                    type: 'object', 
                    properties: { 
                      foo: { 
                        type: 'string' 
                      } 
                    } 
                  })
validate({ foo: 'bar' }) // true

// or

const validate = request
                  .getSerializationFunction('body')
validate({ foo: 0.5 }) // false
```

See [.compilaValidationSchema(schema, [httpStatus])](#compileserializationschema)
for more information on how to compile validation function.

### .compileValidationSchema(schema, [httpPart])
<a id="compilevalidationschema"></a>

This function will compile a validation schema and
return a function that can be used to validate data.
The function returned (a.k.a. _validation function_) is compiled
by using the provided `SchemaControler#ValidationCompiler`.
Also this is cached by using a `WeakMap` for reducing compilation calls.

The optional paramater `httpPart`, if provided, is forwarded directly
the `ValidationCompiler`, so it can be used to compile the validation
function if a custom `ValidationCompiler` is provided for the route.


```js
const validate = request
                  .compileValidationSchema({
                    type: 'object', 
                    properties: { 
                      foo: { 
                        type: 'string' 
                      } 
                    } 
                  })
validate({ foo: 'bar' }) // true

// or

const validate = request
                  .compileSerializationSchema({
                    type: 'object', 
                    properties: { 
                      foo: { 
                        type: 'string' 
                      } 
                    } 
                  }, 200)
validate({ hello: 'world' }) // false
```

Note that you should be careful when using this function, as it will cache
the compiled valiadtion functions based on the schema provided. If the
schemas provided is mutated or changed, the serialization functions will not
detect that the schema has been altered and for instance it will reuse the
previously compiled serialization function, as the cache is based on
the reference of the schema (Object) previously provided.

If there's a need to change the properties of a schema, always opt to create
a totally new schema (object), otherwise the implementation won't benefit from
the cache mechanism.

:Using the following schema as example:
```js
const schema1 = {
  type: 'object',
  properties: {
    foo: {
      type: 'string'
    }
  }
}
```

*Not*
```js 
const validate = request.compileValidationSchema(schema1)

// Later on...
schema1.properties.foo.type. = 'integer'
const newValidate = request.compileValidationSchema(schema1)

console.log(newValidate === validate) // true
```

*Instead*
```js
const validate = request.compileValidationSchema(schema1)

// Later on...
const newSchema = Object.assign({}, schema1)
newSchema.properties.foo.type = 'integer'

const newValidate = request.compileValidationSchema(newSchema)

console.log(newValidate === validate) // false
```

### .validate(data, [schema | httpStatus], [httpStatus])
<a id="validate"></a>

This function will validate the input based on the provided schema,
or http part passed. If both provided, the `httpPart` parameter
will take presedence.

If there is not a valiodation function for a given `schema`, a new validation
function will be compiled forwarding the `httpPart` if provided.

```js
request
  .validate({ foo: 'bar'}, {  
    type: 'object', 
    properties: { 
      foo: { 
        type: 'string' 
      } 
    } 
  }) // true

// or

request
  .validate({ foo: 'bar'}, {
    type: 'object', 
    properties: { 
      foo: { 
        type: 'string' 
      } 
    } 
  }, 'body') // true

// or

request
  .serializeInput({ hello: 'world'}, 'query') // false
```

See [.compileValidationSchema(schema, [httpStatus])](#compileValidationSchema)
for more information on how to compile validation schemas.