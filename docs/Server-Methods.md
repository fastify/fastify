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
          ulr: String,
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
Function to add middlewares to Fastify, check  [here](https://github.com/fastify/fastify/blob/master/docs/Middlewares.md).

<a name="addHook"></a>
#### addHook
Function to add a specific hook in the lifecycle of Fastify, check  [here](https://github.com/fastify/fastify/blob/master/docs/Hooks.md).

<a name="logger"></a>
#### logger
The logger instance, check  [here](https://github.com/fastify/fastify/blob/master/docs/Logging.md).

<a name="inject"></a>
#### inject
Fake http injection (for testing purposes)  [here](https://github.com/fastify/fastify/blob/master/docs/Testing.md#inject).

<a name="set-schema-compiler"></a>
#### setSchemaCompiler
Set the schema compiler for all routes  [here](https://github.com/fastify/fastify/blob/master/docs/Validation-And-Serialize.md#schema-compiler).
