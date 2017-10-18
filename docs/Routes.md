<h1 align="center">Fastify</h1>

## Routes
<a name="full-declaration"></a>
### Full declaration
```js
fastify.route(options)
```
* `method`: currently it supports `'DELETE'`, `'GET'`, `'HEAD'`, `'PATCH'`, `'POST'`, `'PUT'` and `'OPTIONS'`. It could also be an array of methods.

* `url`: the path of the url to match this route (alias: `path`).
* `schema`: an object containing the schemas for the request and response.
They need to be in
  [JSON Schema](http://json-schema.org/) format, check [here](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md) for more info.

  * `body`: validates the body of the request if it is a POST or a
    PUT.
  * `querystring`: validates the querystring. This can be a complete JSON
  Schema object, with the property `type` of `object` and `properties` object of parameters, or
  simply the values of what would be contained in the `properties` object as shown below.
  * `params`: validates the params.
  * `response`: filter and generate a schema for the response, setting a
    schema allows us to have 10-20% more throughput.
* `beforeHandler(request, reply, done)`: a [function](https://github.com/fastify/fastify/blob/master/docs/Hooks.md#before-handler) called just before the request handler, useful if you need to perform authentication at route level for example, it could also be and array of functions.
* `handler(request, reply)`: the function that will handle this request.
* `schemaCompiler(schema)`: the function that build the schema for the validations. See [here](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md#schema-compiler)

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
      name: { type: 'string' },
      excitement: { type: 'integer' }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  },
  handler: function (request, reply) {
    reply.send({ hello: 'world' })
  }
})
```

```js
fastify.route({
  method: 'GET',
  url: '/',
  schema: { ... },
  beforeHandler: function (request, reply, done) {
    // your authentication logic
    done()
  },
  handler: function (request, reply) {
    reply.send({ hello: 'world' })
  }
})
```

<a name="shorthand-declaration"></a>
### Shorthand declaration
The above route declaration is more *Hapi*-like, but if you prefer an *Express/Restify* approach, we support it as well:
`fastify.get(path, [options], handler)`
`fastify.head(path, [options], handler)`
`fastify.post(path, [options], handler)`
`fastify.put(path, [options], handler)`
`fastify.delete(path, [options], handler)`
`fastify.options(path, [options], handler)`
`fastify.patch(path, [options], handler)`

Example:
```js
const opts = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
}
fastify.get('/', opts, (req, reply) => {
  reply.send({ hello: 'world' })
})
```

`fastify.all(path, [options], handler)` will add the same handler to all the supported methods.

<a name="async-await"></a>
### Async Await
Are you an `async/await` user? We have you covered!
```js
fastify.get('/', options, async function (request, reply) {
  var data = await getData()
  var processed = await processData(data)
  return processed
})
```
As you can see we are not calling `reply.send` to send back the data to the user. You just need to return the body and you are done!
If you need it you can also send back the data to the user with `reply.send`.
```js
fastify.get('/', options, async function (request, reply) {
  var data = await getData()
  var processed = await processData(data)
  reply.send(processed)
})
```
**Warning:** If you use `return` and `reply.send` at the same time, the first one that happens takes precedence, the second value will be discarded, a *warn* log will also be emitted if the value is not `undefined`.

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
Fastify will not complain because you are using the same name for two different routes, because at compilation time it will handle the prefix automatically *(this also means that the performance will not be affected at all!)*.

Now your clients will have access to the following routes:
- `/v1/user`
- `/v2/user`

You can do this as many times as you want, it works also for nested `register` and routes parameter are supported as well.
Be aware that if you use [`fastify-plugin`](https://github.com/fastify/fastify-plugin) this option won't work.
