<h1 align="center">Fastify</h1>

## Hooks

Hooks are registered with the `fastify.addHook` method and allow you to listen to specific events in the application or request/response lifecycle. You have to register a hook before the event is triggered otherwise the event is lost.

## Request/Response Hooks

By using the hooks you can interact directly inside the lifecycle of Fastify. There are four different Hooks that you can use *(in order of execution)*:
- `'onRequest'`
- `'preHandler'`
- `'onSend'`
- `'onResponse'`

Example:
```js
fastify.addHook('onRequest', (req, res, next) => {
  // some code
  next()
})

fastify.addHook('preHandler', (request, reply, next) => {
  // some code
  next()
})

fastify.addHook('onSend', (request, reply, payload, next) => {
  // some code
  next()
})

fastify.addHook('onResponse', (res, next) => {
  // some code
  next()
})
```
Or `async/await`
```js
fastify.addHook('onRequest', async (req, res) => {
  // some code
  await asyncMethod()
  // error occurred
  if (err) {
    throw new Error('some errors occurred.')
  }
  return
})

fastify.addHook('preHandler', async (request, reply) => {
  // some code
  await asyncMethod()
  // error occurred
  if (err) {
    throw new Error('some errors occurred.')
  }
  return
})

fastify.addHook('onSend', async (request, reply, payload) => {
  // some code
  await asyncMethod()
  // error occurred
  if (err) {
    throw new Error('some errors occurred.')
  }
  return
})

fastify.addHook('onResponse', async (res) => {
  // some code
  await asyncMethod()
  // error occurred
  if (err) {
    throw new Error('some errors occurred.')
  }
  return
})
```

**Notice:** the `next` callback is not available when using `async`/`await` or returning a `Promise`. If you do invoke a `next` callback in this situation unexpected behavior may occur, e.g. duplicate invocation of handlers.

| Parameter   |  Description  |
|-------------|-------------|
| req |  Node.js [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) |
| res | Node.js [ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse) |
| request | Fastify [Request](https://github.com/fastify/fastify/blob/master/docs/Request.md) interface |
| reply | Fastify [Reply](https://github.com/fastify/fastify/blob/master/docs/Reply.md) interface |
| payload | The serialized payload |
| next | Function to continue with the [lifecycle](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md) |

It is pretty easy to understand where each hook is executed by looking at the [lifecycle page](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md).<br>
Hooks are affected by Fastify's encapsulation, and can thus be applied to selected routes. See the [Scopes](#scope) section for more information.

If you get an error during the execution of your hook, just pass it to `next()` and Fastify will automatically close the request and send the appropriate error code to the user.

```js
fastify.addHook('onRequest', (req, res, next) => {
  next(new Error('some error'))
})
```

If you want to pass a custom error code to the user, just use `reply.code()`:
```js
fastify.addHook('preHandler', (request, reply, next) => {
  reply.code(500)
  next(new Error('some error'))
})
```

*The error will be handled by [`Reply`](https://github.com/fastify/fastify/blob/master/docs/Reply.md#errors).*

Note that in the `'preHandler'` and `'onSend'` hook the request and reply objects are different from `'onRequest'`, because the two arguments are [`request`](https://github.com/fastify/fastify/blob/master/docs/Request.md) and [`reply`](https://github.com/fastify/fastify/blob/master/docs/Reply.md) core Fastify objects.

#### The `onSend` Hook

If you are using the `onSend` hook, you can change the payload. For example:

```js
fastify.addHook('onSend', (request, reply, payload, next) => {
  var err = null;
  var newPayload = payload.replace('some-text', 'some-new-text')
  next(err, newPayload)
})

// Or async
fastify.addHook('onSend', async (request, reply, payload) => {
  var newPayload = payload.replace('some-text', 'some-new-text')
  return newPayload
})
```

You can also clear the payload to send a response with an empty body by replacing the payload with `null`:

```js
fastify.addHook('onSend', (request, reply, payload, next) => {
  reply.code(304)
  const newPayload = null
  next(null, newPayload)
})
```

> You can also send an empty body by replacing the payload with the empty string `''`, but be aware that this will cause the `Content-Length` header to be set to `0`, whereas the `Content-Length` header will not be set if the payload is `null`.

Note: If you change the payload, you may only change it to a `string`, a `Buffer`, a `stream`, or `null`.

### Respond to a request from a hook
If needed, you can respond to a request before you reach the route handler. An example could be an authentication hook. If you are using `onRequest` or a middleware, use `res.end`. If you are using the `preHandler` hook, use `reply.send`.

```js
fastify.addHook('onRequest', (req, res, next) => {
  res.end('early response')
})

// Works with async functions too
fastify.addHook('preHandler', async (request, reply) => {
  reply.send({ hello: 'world' })
})
```

If you want to respond with a stream, you should avoid using an `async` function for the hook. If you must use an `async` function, your code will need to follow the pattern in [test/hooks-async.js](https://github.com/fastify/fastify/blob/94ea67ef2d8dce8a955d510cd9081aabd036fa85/test/hooks-async.js#L269-L275).

```js
const pump = require('pump')

fastify.addHook('onRequest', (req, res, next) => {
  const stream = fs.createReadStream('some-file', 'utf8')
  pump(stream, res, err => req.log.error(err))
})
```

## Application Hooks

You are able to hook into the application-lifecycle as well. It's important to note that these hooks aren't fully encapsulated. The `this` inside the hooks are encapsulated but the handlers can respond to an event outside the encapsulation boundaries.

- `'onClose'`
- `'onRoute'`

<a name="on-close"></a>
**'onClose'**<br>
Triggered when `fastify.close()` is invoked to stop the server. It is useful when [plugins](https://github.com/fastify/fastify/blob/master/docs/Plugins.md) need a "shutdown" event, such as a connection to a database.<br>
The first argument is the Fastify instance, the second one the `done` callback.
```js
fastify.addHook('onClose', (instance, done) => {
  // some code
  done()
})
```
<a name="on-route"></a>
**'onRoute'**<br>
Triggered when a new route is registered. Listeners are passed a `routeOptions` object as the sole parameter. The interface is synchronous, and, as such, the listeners do not get passed a callback.
```js
fastify.addHook('onRoute', (routeOptions) => {
  // some code
  routeOptions.method
  routeOptions.schema
  routeOptions.url
  routeOptions.bodyLimit
  routeOptions.logLevel
  routeOptions.prefix
})
```
<a name="scope"></a>
### Scope
Except for [Application Hooks](#application-hooks), all hooks are encapsulated. This means that you can decide where your hooks should run by using `register` as explained in the [plugins guide](https://github.com/fastify/fastify/blob/master/docs/Plugins-Guide.md). If you pass a function, that function is bound to the right Fastify context and from there you have full access to the Fastify API.

```js
fastify.addHook('onRequest', function (req, res, next) {
  const self = this // Fastify context
  next()
})
```
Note: using an arrow function will break the binding of this to the Fastify instance.

<a name="before-handler"></a>
### beforeHandler
Despite the name, `beforeHandler` is not a standard hook like `preHandler`, but is a function that your register right in the route option that will be executed only in the specified route. Can be useful if you need to handle the authentication at route level instead of at hook level (`preHandler` for example), it could also be an array of functions.<br>
**`beforeHandler` is executed always after the `preHandler` hook.**

```js
fastify.addHook('preHandler', (request, reply, done) => {
  // your code
  done()
})

fastify.route({
  method: 'GET',
  url: '/',
  schema: { ... },
  beforeHandler: function (request, reply, done) {
    // your code
    done()
  },
  handler: function (request, reply) {
    reply.send({ hello: 'world' })
  }
})

fastify.route({
  method: 'GET',
  url: '/',
  schema: { ... },
  beforeHandler: [
    function first (request, reply, done) {
      // your code
      done()
    },
    function second (request, reply, done) {
      // your code
      done()
    }
  ],
  handler: function (request, reply) {
    reply.send({ hello: 'world' })
  }
})
```
