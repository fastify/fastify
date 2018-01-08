<h1 align="center">Fastify</h1>

## Server Methods

<a name="server"></a>
#### server
`fastify.server`: The Node core [server](https://nodejs.org/api/http.html#http_class_http_server) object

<a name="ready"></a>
#### ready
Function called when all the plugins has been loaded.
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
Starts the server on the given port after all the plugins are loaded, internally waits for the `.ready()` event. The callback is the same as the Node core.
```js
fastify.listen(3000, err => {
  if (err) throw err
})
```

Specifying an address is also supported:

```js
fastify.listen(3000, '127.0.0.1', err => {
  if (err) throw err
})
```

If no callback is provided a Promise is returned:

```js
fastify.listen(3000)
  .then(() => console.log('Listening'))
  .catch(err => {
    console.log('Error starting server:', err)
    process.exit(1)
  })
```

Specifying an address without a callback is also supported:

```js
fastify.listen(3000, '127.0.0.1')
  .then(() => console.log('Listening'))
  .catch(err => {
    console.log('Error starting server:', err)
    process.exit(1)
  })
```

<a name="route"></a>
#### route
Method to add routes to the server, it also have shorthands functions, check [here](https://github.com/fastify/fastify/blob/master/docs/Routes.md).

<a name="routes-iterator"></a>
#### routes iterator
The Fastify instance is an Iterable object with all the registered routes.
The route properties are the same the developer has declared [here](https://github.com/fastify/fastify/blob/master/docs/Routes.md).
```js
fastify.get('/route', opts, handler)

fastify.ready(() => {
  for (var route of fastify) {
    console.log(route)
    /* will output:
    {
      '/route': {
        get: {
          method: String,
          url: String,
          schema: Object,
          handler: Function,
          Request: Function,
          Reply: Function
        }
      }
    }
    */
  }
})
```

<a name="close"></a>
#### close
`fastify.close(callback)`: call this function to close the server instance and run the [`'onClose'`](https://github.com/fastify/fastify/blob/master/docs/Hooks.md#on-close) hook.

<a name="decorate"></a>
#### decorate*
Function useful if you need to decorate the fastify instance, Reply or Request, check [here](https://github.com/fastify/fastify/blob/master/docs/Decorators.md).

<a name="register"></a>
#### register
Fastify allows the user to extend its functionalities with plugins.
A plugin can be a set of routes, a server decorator or whatever, check [here](https://github.com/fastify/fastify/blob/master/docs/Plugins.md).

<a name="use"></a>
#### use
Function to add middlewares to Fastify, check [here](https://github.com/fastify/fastify/blob/master/docs/Middlewares.md).

<a name="addHook"></a>
#### addHook
Function to add a specific hook in the lifecycle of Fastify, check [here](https://github.com/fastify/fastify/blob/master/docs/Hooks.md).

<a name="log"></a>
#### log
The logger instance, check [here](https://github.com/fastify/fastify/blob/master/docs/Logging.md).

<a name="inject"></a>
#### inject
Fake http injection (for testing purposes) [here](https://github.com/fastify/fastify/blob/master/docs/Testing.md#inject).

<a name="set-schema-compiler"></a>
#### setSchemaCompiler
Set the schema compiler for all routes [here](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md#schema-compiler).

<a name="set-not-found-handler"></a>
#### setNotFoundHandler

`fastify.setNotFoundHandler(handler(request, reply))`: set the 404 handler. This call is fully encapsulated, so different plugins can set different not found handlers. The handler is treated like a regular route handler so requests will go through the full [Fastify lifecycle](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md#lifecycle).

<a name="set-error-handler"></a>
#### setErrorHandler

`fastify.setErrorHandler(handler(error, reply))`: set a function that will be called whenever an error happens. The handler is fully encapsulated, so different plugins can set different error handlers, *async await* is supported as well.

This handler can be called if an error occurs after headers are already sent. If this happens you will not be able to set any headers or send a response. You can avoid any logic that sets headers or sends a response by checking the `reply.sent` property.

```js
fastify.setErrorHandler(function (error, reply) {
  if (reply.sent) {
    return
  }
  ... // Send an error response
})
```
