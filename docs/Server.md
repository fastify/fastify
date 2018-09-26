<h1 align="center">Fastify</h1>

<a name="factory"></a>
## Factory

The Fastify module exports a factory function that is used to create new
<a href="https://github.com/fastify/fastify/blob/master/docs/Server.md"><code><b>Fastify server</b></code></a>
instances. This factory function accepts an options object which is used to
customize the resulting instance. This document describes the properties
available in that options object.

<a name="factory-http2"></a>
### `http2` (Status: experimental)

If `true` Node.js core's [HTTP/2](https://nodejs.org/dist/latest-v8.x/docs/api/http2.html) module is used for binding the socket.

+ Default: `false`

<a name="factory-https"></a>
### `https`

An object used to configure the server's listening socket for TLS. The options
are the same as the Node.js core
[`createServer` method](https://nodejs.org/dist/latest-v8.x/docs/api/https.html#https_https_createserver_options_requestlistener).
When this property is `null`, the socket will not be configured for TLS.

This option also applies when the
<a href="https://github.com/fastify/fastify/blob/master/docs/Server.md#factory-http2">
<code><b>http2</b></code>
</a> option is set.

+ Default: `null`

<a name="factory-ignore-slash"></a>
### `ignoreTrailingSlash`

Fastify uses [find-my-way](https://github.com/delvedor/find-my-way) to handle
routing. This option may be set to `true` to ignore trailing slashes in routes.
This option applies to *all* route registrations for the resulting server
instance.

+ Default: `false`

```js
const fastify = require('fastify')({
  ignoreTrailingSlash: true
})

// registers both "/foo" and "/foo/"
fastify.get('/foo/', function (req, reply) {
  res.send('foo')
})

// registers both "/bar" and "/bar/"
fastify.get('/bar', function (req, reply) {
  res.send('bar')
})
```

<a name="factory-max-param-length"></a>
### `maxParamLength`
You can set a custom length for parameters in parametric (standard, regex and multi) routes by using `maxParamLength` option, the default value is 100 characters.<br>
This can be useful especially if you have some regex based route, protecting you against [DoS attacks](https://www.owasp.org/index.php/Regular_expression_Denial_of_Service_-_ReDoS).<br>
*If the maximum length limit is reached, the not found route will be invoked.*

<a name="factory-body-limit"></a>
### `bodyLimit`

Defines the maximum payload, in bytes, the server is allowed to accept.

+ Default: `1048576` (1MiB)

<a name="factory-logger"></a>
### `logger`

Fastify includes built-in logging via the [Pino](https://getpino.io/) logger.
This property is used to configure the internal logger instance.

The possible values this property may have are:

+ Default: `false`. The logger is disabled. All logging methods will point to a
null logger [abstract-logging](https://npm.im/abstract-logging) instance.

+ `pinoInstance`: a previously instantiated instance of Pino. The internal
logger will point to this instance.

+ `object`: a standard Pino [options object](https://github.com/pinojs/pino/blob/c77d8ec5ce/docs/API.md#constructor).
This will be passed directly to the Pino constructor. If the following properties
are not present on the object, they will be added accordingly:
    * `genReqId`: a synchronous function that will be used to generate identifiers
    for incoming requests. The default function generates sequential identifiers.
    * `level`: the minimum logging level. If not set, it will be set to `'info'`.
    * `serializers`: a hash of serialization functions. By default, serializers
      are added for `req` (incoming request objects), `res` (outgoing repsonse
      objets), and `err` (standard `Error` objects). When a log method receives
      an object with any of these properties then the respective serializer will
      be used for that property. For example:
        ```js
        fastify.get('/foo', function (req, res) {
          req.log.info({req}) // log the serialized request object
          res.send('foo')
        })
        ```
      Any user supplied serializer will override the default serializer of the
      corresponding property.

<a name="custom-http-server"></a>
### `serverFactory`
You can pass a custom http server to Fastify by using the `serverFactory` option.<br/>
`serverFactory` is a function that takes an `handler` parameter, which takes the `request` and `response` objects as parameters, and an options object, which is the same you have passed to Fastify.

```js
const serverFactory = (handler, opts) => {
  const server = http.createServer((req, res) => {
    handler(req, res)
  })

  return server
}

const fastify = Fastify({ serverFactory })

fastify.get('/', (req, reply) => {
  reply.send({ hello: 'world' })
})

fastify.listen(3000)
```

Internally Fastify uses the API of Node core http server, so if you are using a custom server you must be sure to have the same API exposed. If not, you can enhance the server instance inside the `serverFactory` function before the `return` statement.

<a name="factory-case-sensitive"></a>
### `caseSensitive`

By default, value equal to `true`, routes are registered as case sensitive. That is, `/foo` is not equivalent to `/Foo`. When set to `false`, routes are registered in a fashion such that `/foo` is equivalent to `/Foo` which is equivalent to `/FOO`.

Setting `caseSensitive` to `false` will also result in
all params (and all value matched by regexps) to be lowercased as well.

```js
fastify.get('/user/:username', (request, reply) => {
  // Given the URL: /user/NodeJS
  console.log(request.params.username) // -> 'nodejs'
})
```

Please note this setting this option to `false` goes against
[RFC3986](https://tools.ietf.org/html/rfc3986#section-6.2.2.1).

<a name="factory-request-id-header"></a>
### `requestIdHeader`

The header name used to know the request id. See [the request id](https://github.com/fastify/fastify/blob/master/docs/Logging.md#logging-request-id) section.

+ Default: `'request-id'`

<a name="factory-trust-proxy"></a>
### `trustProxy`

By enabling the `trustProxy` option, Fastify will have knowledge that it's sitting behind a proxy and that the `X-Forwarded-*` header fields may be trusted, which otherwise may be easily spoofed.

```js
const fastify = Fastify({ trustProxy: true })
```

+ Default: `false`
+ `true/false`: Trust all proxies (`true`) or do not trust any proxies (`false`).
+ `string`: Trust only given IP/CIDR (e.g. `'127.0.0.1'`). May be a list of comma separated values (e.g. `'127.0.0.1,192.168.1.1/24'`).
+ `Array<string>`: Trust only given IP/CIDR list (e.g. `['127.0.0.1']`).
+ `number`: Trust the nth hop from the front-facing proxy server as the client.
+ `Function`: Custom trust function that takes `address` as first arg
    ```js
    function myTrustFn(address, hop) {
      return address === '1.2.3.4' || hop === 1
    }
    ```

For more examples refer to [proxy-addr](https://www.npmjs.com/package/proxy-addr) package.

You may also access `ip` and `hostname` values from raw `request`.

```js
fastify.get('/', (request, reply) => {
  console.log(request.raw.ip)
  console.log(request.raw.hostname)
})
```

<a name="plugin-timeout"></a>
### `pluginTimeout`

The maximum amount of time in milliseconds in which a plugin can load.
If not, [`ready`](https://github.com/fastify/fastify/blob/master/docs/Server.md#ready)
will complete with an `Error` with code `'ERR_AVVIO_PLUGIN_TIMEOUT'`.

+ Default: `0` (disabled)

## Instance

### Server Methods

<a name="server"></a>
#### server
`fastify.server`: The Node core [server](https://nodejs.org/api/http.html#http_class_http_server) object as returned by the [**`Fastify factory function`**](https://github.com/fastify/fastify/blob/master/docs/Server.md).

<a name="after"></a>
#### after
Invoked when the current plugin and all the plugins
that have been registered within it have finished loading.
It is always executed before the method `fastify.ready`.

```js
fastify
  .register((instance, opts, next) => {
    console.log('Current plugin')
    next()
  })
  .after(err => {
    console.log('After current plugin')
  })
  .register((instance, opts, next) => {
    console.log('Next plugin')
    next()
  })
  .ready(err => {
    console.log('Everything has been loaded')
  })
```

<a name="ready"></a>
#### ready
Function called when all the plugins have been loaded.
It takes an error parameter if something went wrong.
```js
fastify.ready(err => {
  if (err) throw err
})
```
If it is called without any arguments, it will return a `Promise`:

```js
fastify.ready().then(() => {
  console.log('successfully booted!')
}, (err) => {
  console.log('an error happened', err)
})
```

<a name="listen"></a>
#### listen
Starts the server on the given port after all the plugins are loaded, internally waits for the `.ready()` event. The callback is the same as the Node core. By default, the server will listen on the address resolved by `localhost` when no specific address is provided (`127.0.0.1` or `::1` depending on the operating system). If listening on any available interface is desired, then specifying `0.0.0.0` for the address will listen on all IPv4 address. Using `::` for the address will listen on all IPv6 addresses, and, depending on OS, may also listen on all IPv4 addresses. Be careful when deciding to listen on all interfaces; it comes with inherent [security risks](https://web.archive.org/web/20170831174611/https://snyk.io/blog/mongodb-hack-and-secure-defaults/).

```js
fastify.listen(3000, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

Specifying an address is also supported:

```js
fastify.listen(3000, '127.0.0.1', (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

Specifying a backlog queue size is also supported:

```js
fastify.listen(3000, '127.0.0.1', 511, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

If no callback is provided a Promise is returned:

```js
fastify.listen(3000)
  .then((address) => console.log(`server listening on ${address}`))
  .catch(err => {
    console.log('Error starting server:', err)
    process.exit(1)
  })
```

Specifying an address without a callback is also supported:

```js
fastify.listen(3000, '127.0.0.1')
  .then((address) => console.log(`server listening on ${address}`))
  .catch(err => {
    console.log('Error starting server:', err)
    process.exit(1)
  })
```

When deploying to a Docker, and potentially other, containers, it is advisable to listen on `0.0.0.0` because they do not default to exposing mapped ports to `localhost`:

```js
fastify.listen(3000, '0.0.0.0', (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

If the `port` is omitted (or is set to zero), a random available port is automatically chosen (later available via `fastify.server.address().port`).

<a name="route"></a>
#### route
Method to add routes to the server, it also has shorthand functions, check [here](https://github.com/fastify/fastify/blob/master/docs/Routes.md).

<a name="close"></a>
#### close
`fastify.close(callback)`: call this function to close the server instance and run the [`'onClose'`](https://github.com/fastify/fastify/blob/master/docs/Hooks.md#on-close) hook.<br>
Calling `close` will also cause the server to respond to every new incoming request with a `503` error and destroy that request.

<a name="decorate"></a>
#### decorate*
Function useful if you need to decorate the fastify instance, Reply or Request, check [here](https://github.com/fastify/fastify/blob/master/docs/Decorators.md).

<a name="register"></a>
#### register
Fastify allows the user to extend its functionality with plugins.
A plugin can be a set of routes, a server decorator or whatever, check [here](https://github.com/fastify/fastify/blob/master/docs/Plugins.md).

<a name="use"></a>
#### use
Function to add middlewares to Fastify, check [here](https://github.com/fastify/fastify/blob/master/docs/Middlewares.md).

<a name="addHook"></a>
#### addHook
Function to add a specific hook in the lifecycle of Fastify, check [here](https://github.com/fastify/fastify/blob/master/docs/Hooks.md).

<a name="base-path"></a>
#### basepath
The full path that will be prefixed to a route.

Example:

```js
fastify.register(function (instance, opts, next) {
  instance.get('/foo', function (request, reply) {
    // Will log "basePath: /v1"
    request.log.info('basePath: %s', instance.basePath)
    reply.send({basePath: instance.basePath})
  })

  instance.register(function (instance, opts, next) {
    instance.get('/bar', function (request, reply) {
      // Will log "basePath: /v1/v2"
      request.log.info('basePath: %s', instance.basePath)
      reply.send({basePath: instance.basePath})
    })

    next()
  }, { prefix: '/v2' })

  next()
}, { prefix: '/v1' })
```

<a name="log"></a>
#### log
The logger instance, check [here](https://github.com/fastify/fastify/blob/master/docs/Logging.md).

<a name="inject"></a>
#### inject
Fake http injection (for testing purposes) [here](https://github.com/fastify/fastify/blob/master/docs/Testing.md#inject).

<a name="add-schema"></a>
#### addSchema
`fastify.addSchema(schemaObj)`, adds a shared schema to the Fastify instance. This allows you to reuse it everywhere in your application just by writing the schema id that you need.<br/>
To learn more, see [shared schema example](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md#shared-schema) in the [Validation and Serialization](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md) documentation.

<a name="set-schema-compiler"></a>
#### setSchemaCompiler
Set the schema compiler for all routes [here](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md#schema-compiler).

<a name="set-not-found-handler"></a>
#### setNotFoundHandler

`fastify.setNotFoundHandler(handler(request, reply))`: set the 404 handler. This call is encapsulated by prefix, so different plugins can set different not found handlers if a different [`prefix` option](https://github.com/fastify/fastify/blob/master/docs/Plugins.md#route-prefixing-option) is passed to `fastify.register()`. The handler is treated like a regular route handler so requests will go through the full [Fastify lifecycle](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md#lifecycle).

You can also register [beforeHandler](https://www.fastify.io/docs/latest/Hooks/#beforehandler) hook for the 404 handler.

```js
fastify.setNotFoundHandler({
  beforeHandler: (req, reply, next) => {
    req.body.beforeHandler = true
    next()
  }  
}, function (request, reply) {
    // Default not found handler with beforeHandler hook
})

fastify.register(function (instance, options, next) {
  instance.setNotFoundHandler(function (request, reply) {
    // Handle not found request without beforeHandler hook
    // to URLs that begin with '/v1'
  })
  next()
}, { prefix: '/v1' })
```

<a name="set-error-handler"></a>
#### setErrorHandler

`fastify.setErrorHandler(handler(error, request, reply))`: Set a function that will be called whenever an error happens. The handler is fully encapsulated, so different plugins can set different error handlers. *async-await* is supported as well.

```js
fastify.setErrorHandler(function (error, request, reply) {
  // Send error response
})
```

<a name="print-routes"></a>
#### printRoutes

`fastify.printRoutes()`: Prints the representation of the internal radix tree used by the router, useful for debugging.<br/>
*Remember to call it inside or after a `ready` call.*

```js
fastify.get('/test', () => {})
fastify.get('/test/hello', () => {})
fastify.get('/hello/world', () => {})

fastify.ready(() => {
  console.log(fastify.printRoutes())
  // └── /
  //   ├── test (GET)
  //   │   └── /hello (GET)
  //   └── hello/world (GET)
})
```
