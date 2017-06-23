<h1 align="center">Fastify</h1>

## Routes
<a name="full-declaration"></a>
### Full declaration
```js
fastify.route(options)
```
* `method`: currently it supports `'DELETE'`, `'GET'`, `'HEAD'`, `'PATCH'`, `'POST'`, `'PUT'` and `'OPTIONS'`.

* `url`: the path of the url to match this route (alias: `path`).
* `schema`: an object containing the schemas for the request and response.
They need to be in
  [JSON Schema](http://json-schema.org/) format, check [here](https://github.com/fastify/fastify/blob/master/docs/Validation-And-Serialize.md) for more info.

  * `body`: validates the body of the request if it is a POST or a
    PUT.
  * `querystring`: validates the querystring. This can be a complete JSON
  Schema object, with the property `type` of `object` and `properties` object of parameters, or
  simply the values of what would be contained in the `properties` object as shown below.
  * `params`: validates the params.
  * `response`: filter and generate a schema for the response, setting a
    schema allows us to have 10-20% more throughput.
* `handler(request, reply)`: the function that will handle this request.

  `request` is defined in [Request](https://github.com/fastify/fastify/blob/master/docs/Request.md).

  `reply` is defined in [Reply](https://github.com/fastify/fastify/blob/master/docs/Reply.md).

The routing is handled by [find-my-way](https://github.com/delvedor/find-my-way), so you can refer its documentation for the url building.

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
    response: {
      200: {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      }
    }
  },
  handler: function (request, reply) {
    reply.send({ hello: 'world' })
  }
})
```

<a name="shorthand-declaration"></a>
### Shorthand declaration
The above route declaration is more *Hapi*-like, but if you prefer an *Express/Restify* approach, we support it as well:
`fastify.get(path, [schema], handler)`  
`fastify.head(path, [schema], handler)`  
`fastify.post(path, [schema], handler)`  
`fastify.put(path, [schema], handler)`  
`fastify.delete(path, [schema], handler)`  
`fastify.options(path, [schema], handler)`  
`fastify.patch(path, [schema], handler)`  

<a name="route-prefixing"></a>
### Route Prefixing
Sometimes you need to maintain two or more different versions of the same api, a classic approach is to prefix all the routes with the api version number, `/v1/user` for example.  
Fastify offers you a fast and smart way to create different version of the same api without changing all the route names by hand, *route prefixing*. Let's see how it works:

```js
// server.js
const fastify = require('fastify')()

fastify.register(require('./routes/v1/users'), { prefix: '/v1' })
fastify.register(require('./routes/v2/users'), { prefix: '/v2' })

fastify.listen(3000)
```
```js
// routes/v1/users.js
module.exports = function (fastify, opts, next) {
  fastify.get('/user', handler_v1)
  next()
}
```
```js
// routes/v2/users.js
module.exports = function (fastify, opts, next) {
  fastify.get('/user', handler_v2)
  next()
}
```
Fastify will not complain because your are using the same name for two different routes, because at compilation time it will handle the prefix automatically *(this also means that the performances will not be affected at all!)*.

Now your clients will have access to the following routes:
- `/v1/user`
- `/v2/user`

You can to this as many time as you want, it works also for nested `register` and routes parameter are supported as well.
