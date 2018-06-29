<h1 align="center">Fastify</h1>

## Server Methods

<a name="server"></a>
#### server
`fastify.server`: The Node core [server](https://nodejs.org/api/http.html#http_class_http_server) object as returned by the [**`Fastify factory function`**](https://github.com/fastify/fastify/blob/master/docs/Factory.md).

<a name="after"></a>
#### after
Invoked when the current plugin and all the plugins
that have been registered within it have finished loading.
It is always executed before the method `fastify.ready`.

```js
fastify
  .register((instance. opts, next) => {
    console.log('Current plugin')
    next()
  })
  .after(err => {
    console.log('After current plugin')
  })
  .register((instance. opts, next) => {
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
Starts the server on the given port after all the plugins are loaded, internally waits for the `.ready()` event. The callback is the same as the Node core. By default, the server will listen on address `127.0.0.1` when no specific address is provided. If listening on any available interface is desired, then specifying `0.0.0.0` for the address will listen on all IPv4 address. Using `::` for the address will listen on all IPv6 addresses, and, depending on OS, may also listen on all IPv4 addresses. Be careful when deciding to listen on all interfaces; it comes with inherent [security risks](https://web.archive.org/web/20170831174611/https://snyk.io/blog/mongodb-hack-and-secure-defaults/).

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
  .then((adress) => console.log(`server listening on ${address}`))
  .catch(err => {
    console.log('Error starting server:', err)
    process.exit(1)
  })
```

When deploying to a Docker, and potentially other, containers, it is advisable to listen on `0.0.0.0` because they do not default to exposing mapped ports to `127.0.0.1`:

```js
fastify.listen(3000, '0.0.0.0', (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

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
