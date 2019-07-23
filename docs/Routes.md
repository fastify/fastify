<h1 align="center">Fastify</h1>

## Routes
You have two ways to declare a route with Fastify, the shorthand method and the full declaration. Let's start with the second one:
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
  * `querystring` or `query`: validates the querystring. This can be a complete JSON
  Schema object, with the property `type` of `object` and `properties` object of parameters, or
  simply the values of what would be contained in the `properties` object as shown below.
  * `params`: validates the params.
  * `response`: filter and generate a schema for the response, setting a
    schema allows us to have 10-20% more throughput.
* `attachValidation`: attach `validationError` to request, if there is a schema validation error, instead of sending the error to the error handler.
* `onRequest(request, reply, done)`: a [function](https://github.com/fastify/fastify/blob/master/docs/Hooks.md#route-hooks) as soon that a request is received, it could also be an array of functions.
* `preValidation(request, reply, done)`: a [function](https://github.com/fastify/fastify/blob/master/docs/Hooks.md#route-hooks) called after the shared `preValidation` hooks, useful if you need to perform authentication at route level for example, it could also be an array of functions.
* `preHandler(request, reply, done)`: a [function](https://github.com/fastify/fastify/blob/master/docs/Hooks.md#route-hooks) called just before the request handler, it could also be an array of functions.
* `preSerialization(request, reply, payload, done)`: a [function](https://github.com/fastify/fastify/blob/master/docs/Hooks.md#route-hooks) called just before the serialization, it could also be an array of functions.
* `handler(request, reply)`: the function that will handle this request.
* `schemaCompiler(schema)`: the function that build the schema for the validations. See [here](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md#schema-compiler)
* `bodyLimit`: prevents the default JSON body parser from parsing request bodies larger than this number of bytes. Must be an integer. You may also set this option globally when first creating the Fastify instance with `fastify(options)`. Defaults to `1048576` (1 MiB).
* `logLevel`: set log level for this route. See below.
* `config`: object used to store custom configuration.
* `version`: a [semver](http://semver.org/) compatible string that defined the version of the endpoint. [Example](https://github.com/fastify/fastify/blob/master/docs/Routes.md#version).
* `prefixTrailingSlash`: string used to determine how to handle passing `/` as a route with a prefix.
  * `both` (default): Will register both `/prefix` and `/prefix/`.
  * `slash`: Will register only `/prefix/`.
  * `no-slash`: Will register only `/prefix`.

  `request` is defined in [Request](https://github.com/fastify/fastify/blob/master/docs/Request.md).

  `reply` is defined in [Reply](https://github.com/fastify/fastify/blob/master/docs/Reply.md).


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

<a name="shorthand-declaration"></a>
### Shorthand declaration
The above route declaration is more *Hapi*-like, but if you prefer an *Express/Restify* approach, we support it as well:<br>
`fastify.get(path, [options], handler)`<br>
`fastify.head(path, [options], handler)`<br>
`fastify.post(path, [options], handler)`<br>
`fastify.put(path, [options], handler)`<br>
`fastify.delete(path, [options], handler)`<br>
`fastify.options(path, [options], handler)`<br>
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
fastify.get('/', opts, (request, reply) => {
  reply.send({ hello: 'world' })
})
```

`fastify.all(path, [options], handler)` will add the same handler to all the supported methods.

The handler may also be supplied via the `options` object:
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
  },
  handler (request, reply) {
    reply.send({ hello: 'world' })
  }
}
fastify.get('/', opts)
```

> Note: if the handler is specified in both the `options` and as the third parameter to the shortcut method then throws duplicate `handler` error.

<a name="url-building"></a>
### Url building
Fastify supports both static and dynamic urls.<br>
To register a **parametric** path, use the *colon* before the parameter name. For **wildcard** use the *star*.
*Remember that static routes are always checked before parametric and wildcard.*

```js
// parametric
fastify.get('/example/:userId', (request, reply) => {}))
fastify.get('/example/:userId/:secretToken', (request, reply) => {}))

// wildcard
fastify.get('/example/*', (request, reply) => {}))
```

Regular expression routes are supported as well, but pay attention, RegExp are very expensive in term of performance!
```js
// parametric with regexp
fastify.get('/example/:file(^\\d+).png', (request, reply) => {}))
```

It's possible to define more than one parameter within the same couple of slash ("/"). Such as:
```js
fastify.get('/example/near/:lat-:lng/radius/:r', (request, reply) => {}))
```
*Remember in this case to use the dash ("-") as parameters separator.*

Finally it's possible to have multiple parameters with RegExp.
```js
fastify.get('/example/at/:hour(^\\d{2})h:minute(^\\d{2})m', (request, reply) => {}))
```
In this case as parameter separator it's possible to use whatever character is not matched by the regular expression.

Having a route with multiple parameters may affect negatively the performance, so prefer single parameter approach whenever possible, especially on routes which are on the hot path of your application.
If you are interested in how we handle the routing, checkout [find-my-way](https://github.com/delvedor/find-my-way).

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
**Warning:** You can't return `undefined`. For more details read [promise-resolution](#promise-resolution).

As you can see we are not calling `reply.send` to send back the data to the user. You just need to return the body and you are done!

If you need it you can also send back the data to the user with `reply.send`.
```js
fastify.get('/', options, async function (request, reply) {
  var data = await getData()
  var processed = await processData(data)
  reply.send(processed)
})
```
**Warning:**
* If you use `return` and `reply.send` at the same time, the first one that happens takes precedence, the second value will be discarded, a *warn* log will also be emitted because you tried to send a response twice.
* You can't return `undefined`. For more details read [promise-resolution](#promise-resolution).

<a name="promise-resolution"></a>
### Promise resolution

If your handler is an `async` function or returns a promise, you should be aware of a special behaviour which is necessary to support the callback and promise control-flow. If the handler's promise is resolved with `undefined`, it will be ignored causing the request to hang and an *error* log to be emitted.

1. If you want to use `async/await` or promises but respond a value with `reply.send`:
    - **Don't** `return` any value.
    - **Don't** forget to call `reply.send`.
2. If you want to use `async/await` or promises:
    - **Don't** use `reply.send`.
    - **Don't** return `undefined`.

In this way, we can support both `callback-style` and `async-await`, with the minimum trade-off. In spite of so much freedom we highly recommend to go with only one style because error handling should be handled in a consistent way within your application.

**Notice**: Every async function returns a promise by itself.

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
module.exports = function (fastify, opts, done) {
  fastify.get('/user', handler_v1)
  done()
}
```
```js
// routes/v2/users.js
module.exports = function (fastify, opts, done) {
  fastify.get('/user', handler_v2)
  done()
}
```
Fastify will not complain because you are using the same name for two different routes, because at compilation time it will handle the prefix automatically *(this also means that the performance will not be affected at all!)*.

Now your clients will have access to the following routes:
- `/v1/user`
- `/v2/user`

You can do this as many times as you want, it works also for nested `register` and routes parameter are supported as well.
Be aware that if you use [`fastify-plugin`](https://github.com/fastify/fastify-plugin) this option won't work.

#### Handling of / route inside prefixed plugins

The `/` route has a different behavior depending if the prefix ends with
`/` or not. As an example, if we consider a prefix `/something/`,
adding a `/` route will only match `/something/`. If we consider a
prefix `/something`, adding a `/` route will match both `/something` 
and `/something/`.

See the `prefixTrailingSlash` route option above to change this behaviour.

<a name="custom-log-level"></a>
### Custom Log Level
It could happen that you need different log levels in your routes, Fastify achieves this in a very straightforward way.<br/>
You just need to pass the option `logLevel` to the plugin option or the route option with the [value](https://github.com/pinojs/pino/blob/master/docs/API.md#discussion-3) that you need.

Be aware that if you set the `logLevel` at plugin level, also the [`setNotFoundHandler`](https://github.com/fastify/fastify/blob/master/docs/Server.md#setnotfoundhandler) and [`setErrorHandler`](https://github.com/fastify/fastify/blob/master/docs/Server.md#seterrorhandler) will be affected.

```js
// server.js
const fastify = require('fastify')({ logger: true })

fastify.register(require('./routes/user'), { logLevel: 'warn' })
fastify.register(require('./routes/events'), { logLevel: 'debug' })

fastify.listen(3000)
```
Or you can directly pass it to a route:
```js
fastify.get('/', { logLevel: 'warn' }, (request, reply) => {
  reply.send({ hello: 'world' })
})
```
*Remember that the custom log level is applied only to the routes, and not to the global Fastify Logger, accessible with `fastify.log`*


<a name="routes-config"></a>
### Config
Registering a new handler, you can pass a configuration object to it and retrieve it in the handler.

```js
// server.js
const fastify = require('fastify')()

function handler (req, reply) {
  reply.send(reply.context.config.output)
}

fastify.get('/en', { config: { output: 'hello world!' } }, handler)
fastify.get('/it', { config: { output: 'ciao mondo!' } }, handler)

fastify.listen(3000)
```

<a name="version"></a>
### Version
#### Default
If needed you can provide a version option, which will allow you to declare multiple versions of the same route. The versioning should follow the [semver](http://semver.org/) specification.<br/>
Fastify will automatically detect the `Accept-Version` header and route the request accordingly (advanced ranges and pre-releases currently are not supported).<br/>
*Be aware that using this feature will cause a degradation of the overall performances of the router.*
```js
fastify.route({
  method: 'GET',
  url: '/',
  version: '1.2.0',
  handler: function (request, reply) {
    reply.send({ hello: 'world' })
  }
})

fastify.inject({
  method: 'GET',
  url: '/',
  headers: {
    'Accept-Version': '1.x' // it could also be '1.2.0' or '1.2.x'
  }
}, (err, res) => {
  // { hello: 'world' }
})
```
If you declare multiple versions with the same major or minor, Fastify will always choose the highest compatible with the `Accept-Version` header value.<br/>
If the request will not have the `Accept-Version` header, a 404 error will be returned.
#### Custom
It's possible to define a custom versioning logic. This can be done through the [`versioning`](https://github.com/fastify/fastify/blob/master/docs/Server.md#versioning) configuration, when creating a fastify server instance.
