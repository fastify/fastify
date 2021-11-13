<h1 align="center">Fastify</h1>

## Routes

The routes methods will configure the endpoints of your application.
You have two ways to declare a route with Fastify, the shorthand method and the full declaration.

- [Full Declaration](#full-declaration)
- [Route Options](#options)
- [Shorthand Declaration](#shorthand-declaration)
- [URL Parameters](#url-building)
- [Use `async`/`await`](#async-await)
- [Promise resolution](#promise-resolution)
- [Route Prefixing](#route-prefixing)
- Logs
  - [Custom Log Level](#custom-log-level)
  - [Custom Log Serializer](#custom-log-serializer)
- [Route handler configuration](#routes-config)
- [Route constraints](#constraints)

<a name="full-declaration"></a>
### Full declaration

```js
fastify.route(options)
```

<a name="options"></a>
### Routes options

* `method`: currently it supports `'DELETE'`, `'GET'`, `'HEAD'`, `'PATCH'`, `'POST'`, `'PUT'` and `'OPTIONS'`. It could also be an array of methods.
* `url`: the path of the URL to match this route (alias: `path`).
* `schema`: an object containing the schemas for the request and response.
They need to be in
  [JSON Schema](https://json-schema.org/) format, check [here](Validation-and-Serialization.md) for more info.

  * `body`: validates the body of the request if it is a POST, PUT, or PATCH method.
  * `querystring` or `query`: validates the querystring. This can be a complete JSON
  Schema object, with the property `type` of `object` and `properties` object of parameters, or
  simply the values of what would be contained in the `properties` object as shown below.
  * `params`: validates the params.
  * `response`: filter and generate a schema for the response, setting a
    schema allows us to have 10-20% more throughput.
* `exposeHeadRoute`: creates a sibling `HEAD` route for any `GET` routes. Defaults to the value of [`exposeHeadRoutes`](Server.md#exposeHeadRoutes) instance option. If you want a custom `HEAD` handler without disabling this option, make sure to define it before the `GET` route.
* `attachValidation`: attach `validationError` to request, if there is a schema validation error, instead of sending the error to the error handler.
* `onRequest(request, reply, done)`: a [function](Hooks.md#onrequest) as soon that a request is received, it could also be an array of functions.
* `preParsing(request, reply, done)`: a [function](Hooks.md#preparsing) called before parsing the request, it could also be an array of functions.
* `preValidation(request, reply, done)`: a [function](Hooks.md#prevalidation) called after the shared `preValidation` hooks, useful if you need to perform authentication at route level for example, it could also be an array of functions.
* `preHandler(request, reply, done)`: a [function](Hooks.md#prehandler) called just before the request handler, it could also be an array of functions.
* `preSerialization(request, reply, payload, done)`: a [function](Hooks.md#preserialization) called just before the serialization, it could also be an array of functions.
* `onSend(request, reply, payload, done)`: a [function](Hooks.md#route-hooks) called right before a response is sent, it could also be an array of functions.
* `onResponse(request, reply, done)`: a [function](Hooks.md#onresponse) called when a response has been sent, so you will not be able to send more data to the client. It could also be an array of functions.
* `onTimeout(request, reply, done)`: a [function](Hooks.md#ontimeout) called when a request is timed out and the HTTP socket has been hanged up.
* `onError(request, reply, error, done)`: a [function](Hooks.md#onerror) called when an Error is thrown or send to the client by the route handler.
* `handler(request, reply)`: the function that will handle this request. The [Fastify server](Server.md) will be bound to `this` when the handler is called. Note: using an arrow function will break the binding of `this`.
* `errorHandler(error, request, reply)`: a custom error handler for the scope of the request. Overrides the default error global handler, and anything set by [`setErrorHandler`](Server.md#setErrorHandler), for requests to the route. To access the default handler, you can access `instance.errorHandler`. Note that this will point to fastify's default `errorHandler` only if a plugin hasn't overridden it already.
* `validatorCompiler({ schema, method, url, httpPart })`: function that builds schemas for request validations. See the [Validation and Serialization](Validation-and-Serialization.md#schema-validator) documentation.
* `serializerCompiler({ { schema, method, url, httpStatus } })`: function that builds schemas for response serialization. See the [Validation and Serialization](Validation-and-Serialization.md#schema-serializer) documentation.
* `schemaErrorFormatter(errors, dataVar)`: function that formats the errors from the validation compiler. See the [Validation and Serialization](Validation-and-Serialization.md#error-handling) documentation. Overrides the global schema error formatter handler, and anything set by `setSchemaErrorFormatter`, for requests to the route.
* `bodyLimit`: prevents the default JSON body parser from parsing request bodies larger than this number of bytes. Must be an integer. You may also set this option globally when first creating the Fastify instance with `fastify(options)`. Defaults to `1048576` (1 MiB).
* `logLevel`: set log level for this route. See below.
* `logSerializers`: set serializers to log for this route.
* `config`: object used to store custom configuration.
* `version`: a [semver](https://semver.org/) compatible string that defined the version of the endpoint. [Example](Routes.md#version).
* `prefixTrailingSlash`: string used to determine how to handle passing `/` as a route with a prefix.
  * `both` (default): Will register both `/prefix` and `/prefix/`.
  * `slash`: Will register only `/prefix/`.
  * `no-slash`: Will register only `/prefix`.

  `request` is defined in [Request](Request.md).

  `reply` is defined in [Reply](Reply.md).

**Notice:** The documentation of `onRequest`, `preParsing`, `preValidation`,
`preHandler`, `preSerialization`, `onSend`, and `onResponse` are described in
more detail in [Hooks](Hooks.md). Additionally, to send a response before the
request is handled by the `handler` please refer to
[Respond to a request from a hook](Hooks.md#respond-to-a-request-from-a-hook).

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
  handler: function (request, reply) {
    reply.send({ hello: 'world' })
  }
}
fastify.get('/', opts)
```

> Note: if the handler is specified in both the `options` and as the third parameter to the shortcut method then throws duplicate `handler` error.

<a name="url-building"></a>
### Url building
Fastify supports both static and dynamic URLs.<br>
To register a **parametric** path, use the *colon* before the parameter name. For **wildcard**, use the *star*.
*Remember that static routes are always checked before parametric and wildcard.*

```js
// parametric
fastify.get('/example/:userId', (request, reply) => {})
fastify.get('/example/:userId/:secretToken', (request, reply) => {})

// wildcard
fastify.get('/example/*', (request, reply) => {})
```

Regular expression routes are supported as well, but pay attention, RegExp are very expensive in term of performance!
```js
// parametric with regexp
fastify.get('/example/:file(^\\d+).png', (request, reply) => {})
```

It is possible to define more than one parameter within the same couple of slash ("/"). Such as:
```js
fastify.get('/example/near/:lat-:lng/radius/:r', (request, reply) => {})
```
*Remember in this case to use the dash ("-") as parameters separator.*

Finally it is possible to have multiple parameters with RegExp.
```js
fastify.get('/example/at/:hour(^\\d{2})h:minute(^\\d{2})m', (request, reply) => {})
```
In this case as parameter separator it is possible to use whatever character is not matched by the regular expression.

Having a route with multiple parameters may affect negatively the performance, so prefer single parameter approach whenever possible, especially on routes that are on the hot path of your application.
If you are interested in how we handle the routing, check out [find-my-way](https://github.com/delvedor/find-my-way).

If you want a path containing a colon without declaring a parameter, use a double colon. For example:
```js
fastify.post('/name::verb') // will be interpreted as /name:verb
```

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

As you can see, we are not calling `reply.send` to send back the data to the user. You just need to return the body and you are done!

If you need it you can also send back the data to the user with `reply.send`.
```js
fastify.get('/', options, async function (request, reply) {
  var data = await getData()
  var processed = await processData(data)
  reply.send(processed)
})
```

If the route is wrapping a callback-based API that will call
`reply.send()` outside of the promise chain, it is possible to `await reply`:

```js
fastify.get('/', options, async function (request, reply) {
  setImmediate(() => {
    reply.send({ hello: 'world' })
  })
  await reply
})
```

Returning reply also works:

```js
fastify.get('/', options, async function (request, reply) {
  setImmediate(() => {
    reply.send({ hello: 'world' })
  })
  return reply
})
```

**Warning:**
* When using both `return value` and `reply.send(value)` at the same time, the first one that happens takes precedence, the second value will be discarded, and a *warn* log will also be emitted because you tried to send a response twice.
* You cannot return `undefined`. For more details read [promise-resolution](#promise-resolution).

<a name="promise-resolution"></a>
### Promise resolution

If your handler is an `async` function or returns a promise, you should be aware of a special behavior that is necessary to support the callback and promise control-flow. If the handler's promise is resolved with `undefined`, it will be ignored causing the request to hang and an *error* log to be emitted.

1. If you want to use `async/await` or promises but return a value with `reply.send`:
    - **Do not** `return` any value.
    - **Do not** forget to call `reply.send`.
2. If you want to use `async/await` or promises:
    - **Do not** use `reply.send`.
    - **Do not** return `undefined`.

In this way, we can support both `callback-style` and `async-await`, with the minimum trade-off. In spite of so much freedom we highly recommend to go with only one style because error handling should be handled in a consistent way within your application.

**Notice**: Every async function returns a promise by itself.

<a name="route-prefixing"></a>
### Route Prefixing
Sometimes you need to maintain two or more different versions of the same API; a classic approach is to prefix all the routes with the API version number, `/v1/user` for example.
Fastify offers you a fast and smart way to create different versions of the same API without changing all the route names by hand, *route prefixing*. Let's see how it works:

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
Be aware that if you use [`fastify-plugin`](https://github.com/fastify/fastify-plugin) this option will not work.

#### Handling of / route inside prefixed plugins

The `/` route has a different behavior depending on if the prefix ends with
`/` or not. As an example, if we consider a prefix `/something/`,
adding a `/` route will only match `/something/`. If we consider a
prefix `/something`, adding a `/` route will match both `/something` 
and `/something/`.

See the `prefixTrailingSlash` route option above to change this behavior.

<a name="custom-log-level"></a>
### Custom Log Level
It could happen that you need different log levels in your routes; Fastify achieves this in a very straightforward way.<br/>
You just need to pass the option `logLevel` to the plugin option or the route option with the [value](https://github.com/pinojs/pino/blob/master/docs/api.md#level-string) that you need.

Be aware that if you set the `logLevel` at plugin level, also the [`setNotFoundHandler`](Server.md#setnotfoundhandler) and [`setErrorHandler`](Server.md#seterrorhandler) will be affected.

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

<a name="custom-log-serializer"></a>
### Custom Log Serializer

In some context, you may need to log a large object but it could be a waste of resources for some routes. In this case, you can define some [`serializer`](https://github.com/pinojs/pino/blob/master/docs/api.md#bindingsserializers-object) and attach them in the right context!

```js
const fastify = require('fastify')({ logger: true })

fastify.register(require('./routes/user'), {
  logSerializers: {
    user: (value) => `My serializer one - ${value.name}`
  }
})
fastify.register(require('./routes/events'), {
  logSerializers: {
    user: (value) => `My serializer two - ${value.name} ${value.surname}`
  }
})

fastify.listen(3000)
```

You can inherit serializers by context:

```js
const fastify = Fastify({
  logger: {
    level: 'info',
    serializers: {
      user (req) {
        return {
          method: req.method,
          url: req.url,
          headers: req.headers,
          hostname: req.hostname,
          remoteAddress: req.ip,
          remotePort: req.socket.remotePort
        }
      }
    }
  }
})

fastify.register(context1, {
  logSerializers: {
    user: value => `My serializer father - ${value}`
  }
})

async function context1 (fastify, opts) {
  fastify.get('/', (req, reply) => {
    req.log.info({ user: 'call father serializer', key: 'another key' })
    // shows: { user: 'My serializer father - call father  serializer', key: 'another key' }
    reply.send({})
  })
}

fastify.listen(3000)
```

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

<a name="constraints"></a>
### Constraints

Fastify supports constraining routes to match only certain requests based on some property of the request, like the `Host` header, or any other value via [`find-my-way`](https://github.com/delvedor/find-my-way) constraints. Constraints are specified in the `constraints` property of the route options. Fastify has two built-in constraints ready for use: the `version` constraint and the `host` constraint, and you can add your own custom constraint strategies to inspect other parts of a request to decide if a route should be executed for a request.

#### Version Constraints

You can provide a `version` key in the `constraints` option to a route. Versioned routes allow you to declare multiple handlers for the same HTTP route path, which will then be matched according to each request's `Accept-Version` header. The `Accept-Version` header value should follow the [semver](http://semver.org/) specification, and routes should be declared with exact semver versions for matching.<br/>
Fastify will require a request `Accept-Version` header to be set if the route has a version set, and will prefer a versioned route to a non-versioned route for the same path. Advanced version ranges and pre-releases currently are not supported.<br/>
*Be aware that using this feature will cause a degradation of the overall performances of the router.*

```js
fastify.route({
  method: 'GET',
  url: '/',
  constraints: { version: '1.2.0' },
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

> ## ⚠  Security Notice
> Remember to set a [`Vary`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary) header in your
> responses with the value you are using for defining the versioning (e.g.: `'Accept-Version'`),
> to prevent cache poisoning attacks. You can also configure this as part of your Proxy/CDN.
>
> ```js
> const append = require('vary').append
> fastify.addHook('onSend', async (req, reply) => {
>   if (req.headers['accept-version']) { // or the custom header you are using
>     let value = reply.getHeader('Vary') || ''
>     const header = Array.isArray(value) ? value.join(', ') : String(value)
>     if ((value = append(header, 'Accept-Version'))) { // or the custom header you are using
>       reply.header('Vary', value)
>     }
>   }
> })
> ```

If you declare multiple versions with the same major or minor, Fastify will always choose the highest compatible with the `Accept-Version` header value.<br/>
If the request will not have the `Accept-Version` header, a 404 error will be returned.

It is possible to define a custom version matching logic. This can be done through the [`constraints`](Server.md#constraints) configuration when creating a Fastify server instance.

#### Host Constraints

You can provide a `host` key in the `constraints` route option for to limit that route to only be matched for certain values of the request `Host` header. `host` constraint values can be specified as strings for exact matches or RegExps for arbitrary host matching.

```js
fastify.route({
  method: 'GET',
  url: '/',
  constraints: { host: 'auth.fastify.io' },
  handler: function (request, reply) {
    reply.send('hello world from auth.fastify.io')
  }
})

fastify.inject({
  method: 'GET',
  url: '/',
  headers: {
    'Host': 'example.com'
  }
}, (err, res) => {
  // 404 because the host doesn't match the constraint
})

fastify.inject({
  method: 'GET',
  url: '/',
  headers: {
    'Host': 'auth.fastify.io'
  }
}, (err, res) => {
  // => 'hello world from auth.fastify.io'
})
```

RegExp `host` constraints can also be specified allowing constraining to hosts matching wildcard subdomains (or any other pattern):

```js
fastify.route({
  method: 'GET',
  url: '/',
  constraints: { host: /.*\.fastify\.io/ }, // will match any subdomain of fastify.io
  handler: function (request, reply) {
    reply.send('hello world from ' + request.headers.host)
  }
})
```
