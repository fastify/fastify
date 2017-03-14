<h1 align="center">Fastify</h1>

## Routes
### Full declaration
```js
fastify.route(options)
```
* `method`: currently it supports `'DELETE'`, `'GET'`, `'HEAD'`, `'PATCH'`, `'POST'`, `'PUT'` and `'OPTIONS'`.

* `url`: the path of the url to match this route.
* `schema`: an object containing the schemas for the request and response. They need to be in
  [JSON Schema](http://json-schema.org/) format:

  * `payload`: validates the body of the request if it is a POST or a
    PUT.
  * `querystring`: validates the querystring. This can be a complete JSON
  Schema object, with the property `type` of `object` and `properties` object of parameters, or
  simply the values of what would be contained in the `properties` object as shown below.
  * `params`: validates the params.
  * `out`: filter and generate a schema for the response, setting a
    schema allows us to have 10-20% more throughput.
* `handler(request, reply)`: the function that will handle this request.

  `request` is defined in [Request](#request).

  `reply` is defined in [Reply](#reply).

The routing is handled by [wayfarer](https://github.com/yoshuawuyts/wayfarer), so you can refer its documentation for the url building.

Example:
```js
fastify.route({
  method: 'GET',
  url: '/',
  schema: {
    querystring: {
      name: {
        type: 'string'
      },
      excitement: {
        type: 'integer'
      }
    },
    out: {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      }
    }
  },
  handler: function (request, reply) {
    reply.send({ hello: 'world' })
  }
})
```
### Shorthand declaration
The above route declaration is more *Hapi*-like, but if you prefer an *Express/Restify* approach, we support it as well:
`fastify.get(path, [schema], handler)`  
`fastify.head(path, [schema], handler)`  
`fastify.post(path, [schema], handler)`  
`fastify.put(path, [schema], handler)`  
`fastify.delete(path, [schema], handler)`  
`fastify.options(path, [schema], handler)`  
`fastify.patch(path, [schema], handler)`  
