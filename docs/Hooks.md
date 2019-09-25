<h1 align="center">Fastify</h1>

## Hooks

Hooks are registered with the `fastify.addHook` method and allow you to listen to specific events in the application or request/response lifecycle. You have to register a hook before the event is triggered, otherwise the event is lost.

By using hooks you can interact directly with the lifecycle of Fastify. There are Request/Reply hooks and application hooks:

- [Request/Reply Hooks](#requestreply-hooks)
  - [onRequest](#onRequest)
  - [preParsing](#preParsing)
  - [preValidation](#preValidation)
  - [preHandler](#preHandler)
  - [preSerialization](#preSerialization)
  - [onError](#onError)
  - [onSend](#onSend)
  - [onResponse](#onResponse)
- [Application Hooks](#application-hooks)
  - [onClose](#onclose)
  - [onRoute](#onroute)
  - [onRegister](#onregister)

**Notice:** the `done` callback is not available when using `async`/`await` or returning a `Promise`. If you do invoke a `done` callback in this situation unexpected behaviour may occur, e.g. duplicate invocation of handlers.

## Request/Reply Hooks

[Request](https://github.com/fastify/fastify/blob/master/docs/Request.md) and [Reply](https://github.com/fastify/fastify/blob/master/docs/Reply.md) are the core Fastify objects.<br/>
`done` is the function to continue with the [lifecycle](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md).

It is pretty easy to understand where each hook is executed by looking at the [lifecycle page](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md).<br>
Hooks are affected by Fastify's encapsulation, and can thus be applied to selected routes. See the [Scopes](#scope) section for more information.

There are eight different hooks that you can use in Request/Reply *(in order of execution)*:

### onRequest
```js
fastify.addHook('onRequest', (request, reply, done) => {
  // Some code
  done()
})
```
Or `async/await`:
```js
fastify.addHook('onRequest', async (request, reply) => {
  // Some code
  await asyncMethod()
  // Error occurred
  if (err) {
    throw new Error('Some errors occurred.')
  }
  return
})
```

**Notice:** in the [onRequest](#onRequest) hook, `request.body` will always be `null`, because the body parsing happens before the [preHandler](#preHandler) hook.

### preParsing
```js
fastify.addHook('preParsing', (request, reply, done) => {
  // Some code
  done()
})
```
Or `async/await`:
```js
fastify.addHook('preParsing', async (request, reply) => {
  // Some code
  await asyncMethod()
  // Error occurred
  if (err) {
    throw new Error('Some errors occurred.')
  }
  return
})
```
### preValidation
```js
fastify.addHook('preValidation', (request, reply, done) => {
  // Some code
  done()
})
```
Or `async/await`:
```js
fastify.addHook('preValidation', async (request, reply) => {
  // Some code
  await asyncMethod()
  // Error occurred
  if (err) {
    throw new Error('Some errors occurred.')
  }
  return
})
```
**Notice:** in the [preValidation](#preValidation) hook, `request.body` will always be `null`, because the body parsing happens before the [preHandler](#preHandler) hook.

### preHandler
```js
fastify.addHook('preHandler', (request, reply, done) => {
  // some code
  done()
})
```
Or `async/await`:
```js
fastify.addHook('preHandler', async (request, reply) => {
  // Some code
  await asyncMethod()
  // Error occurred
  if (err) {
    throw new Error('Some errors occurred.')
  }
  return
})
```
### preSerialization

If you are using the `preSerialization` hook, you can change (or replace) the payload before it is serialized. For example:

```js
fastify.addHook('preSerialization', (request, reply, payload, done) => {
  const err = null;
  const newPayload = { wrapped: payload }
  done(err, newPayload)
})
```
Or `async/await`
```js
fastify.addHook('preSerialization', async (request, reply, payload) => {
  return { wrapped: payload }
})
```

Note: the hook is NOT called if the payload is a `string`, a `Buffer`, a `stream` or `null`.

### onError
```js
fastify.addHook('onError', (request, reply, error, done) => {
  // Some code
  done()
})
```
Or `async/await`:
```js
fastify.addHook('onError', async (request, reply, error) => {
  // Useful for custom error logging
  // You should not use this hook to update the error
})
```
This hook is useful if you need to do some custom error logging or add some specific header in case of error.<br/>
It is not intended for changing the error, and calling `reply.send` will throw an exception.<br/>
This hook will be executed only after the `customErrorHandler` has been executed, and only if the `customErrorHandler` sends an error back to the user *(Note that the default `customErrorHandler` always sends the error back to the user)*.<br/>
**Notice:** unlike the other hooks, pass an error to the `done` function is not supported.

### onSend
If you are using the `onSend` hook, you can change the payload. For example:

```js
fastify.addHook('onSend', (request, reply, payload, done) => {
  const err = null;
  const newPayload = payload.replace('some-text', 'some-new-text')
  done(err, newPayload)
})
```
Or `async/await`:
```js
fastify.addHook('onSend', async (request, reply, payload) => {
  const newPayload = payload.replace('some-text', 'some-new-text')
  return newPayload
})
```

You can also clear the payload to send a response with an empty body by replacing the payload with `null`:

```js
fastify.addHook('onSend', (request, reply, payload, done) => {
  reply.code(304)
  const newPayload = null
  done(null, newPayload)
})
```

> You can also send an empty body by replacing the payload with the empty string `''`, but be aware that this will cause the `Content-Length` header to be set to `0`, whereas the `Content-Length` header will not be set if the payload is `null`.

Note: If you change the payload, you may only change it to a `string`, a `Buffer`, a `stream`, or `null`.


### onResponse
```js

fastify.addHook('onResponse', (request, reply, done) => {
  // Some code
  done()
})
```
Or `async/await`:
```js
fastify.addHook('onResponse', async (request, reply) => {
  // Some code
  await asyncMethod()
  // Error occurred
  if (err) {
    throw new Error('Some errors occurred.')
  }
  return
})
```

The `onResponse` hook is executed when a response has been sent, so you will not be able to send more data to the client. It can however be useful for sending data to external services, for example to gather statistics.

### Manage Errors from a hook
If you get an error during the execution of your hook, just pass it to `done()` and Fastify will automatically close the request and send the appropriate error code to the user.

```js
fastify.addHook('onRequest', (request, reply, done) => {
  done(new Error('Some error'))
})
```

If you want to pass a custom error code to the user, just use `reply.code()`:
```js
fastify.addHook('preHandler', (request, reply, done) => {
  reply.code(400)
  done(new Error('Some error'))
})
```

*The error will be handled by [`Reply`](https://github.com/fastify/fastify/blob/master/docs/Reply.md#errors).*

### Respond to a request from a hook
If needed, you can respond to a request before you reach the route handler, for example when implementing an authentication hook. If you are using `onRequest` or `preHandler` use `reply.send`; if you are using a middleware, use `res.end`.

```js
fastify.addHook('onRequest', (request, reply, done) => {
  reply.send('Early response')
})

// Works with async functions too
fastify.addHook('preHandler', async (request, reply) => {
  reply.send({ hello: 'world' })
})
```

If you want to respond with a stream, you should avoid using an `async` function for the hook. If you must use an `async` function, your code will need to follow the pattern in [test/hooks-async.js](https://github.com/fastify/fastify/blob/94ea67ef2d8dce8a955d510cd9081aabd036fa85/test/hooks-async.js#L269-L275).

```js
fastify.addHook('onRequest', (request, reply, done) => {
  const stream = fs.createReadStream('some-file', 'utf8')
  reply.send(stream)
})
```

## Application Hooks

You can hook into the application-lifecycle as well. It's important to note that these hooks aren't fully encapsulated. The `this` inside the hooks are encapsulated but the handlers can respond to an event outside the encapsulation boundaries.

- [onClose](#onclose)
- [onRoute](#onroute)
- [onRegister](#onregister)

<a name="on-close"></a>

### onClose
Triggered when `fastify.close()` is invoked to stop the server. It is useful when [plugins](https://github.com/fastify/fastify/blob/master/docs/Plugins.md) need a "shutdown" event, for example to close an open connection to a database.<br>
The first argument is the Fastify instance, the second one the `done` callback.
```js
fastify.addHook('onClose', (instance, done) => {
  // Some code
  done()
})
```
<a name="on-route"></a>
### onRoute
Triggered when a new route is registered. Listeners are passed a `routeOptions` object as the sole parameter. The interface is synchronous, and, as such, the listeners do not get passed a callback.
```js
fastify.addHook('onRoute', (routeOptions) => {
  //Some code
  routeOptions.method
  routeOptions.schema
  routeOptions.url
  routeOptions.bodyLimit
  routeOptions.logLevel
  routeOptions.prefix
})
```
<a name="on-register"></a>
### onRegister
Triggered when a new plugin is registered and a new encapsulation context is created. The hook will be executed **before** the registered code.<br/>
This hook can be useful if you are developing a plugin that needs to know when a plugin context is formed, and you want to operate in that specific context.<br/>
**Note:** This hook will not be called if a plugin is wrapped inside [`fastify-plugin`](https://github.com/fastify/fastify-plugin).
```js
fastify.decorate('data', [])

fastify.register(async (instance, opts) => {
  instance.data.push('hello')
  console.log(instance.data) // ['hello']

  instance.register(async (instance, opts) => {
    instance.data.push('world')
    console.log(instance.data) // ['hello', 'world']
  })
})

fastify.register(async (instance, opts) => {
  console.log(instance.data) // []
})

fastify.addHook('onRegister', (instance) => {
  // Create a new array from the old one
  // but without keeping the reference
  // allowing the user to have encapsulated
  // instances of the `data` property
  instance.data = instance.data.slice()
})
```

<a name="scope"></a>
### Scope
Except for [Application Hooks](#application-hooks), all hooks are encapsulated. This means that you can decide where your hooks should run by using `register` as explained in the [plugins guide](https://github.com/fastify/fastify/blob/master/docs/Plugins-Guide.md). If you pass a function, that function is bound to the right Fastify context and from there you have full access to the Fastify API.

```js
fastify.addHook('onRequest', function (request, reply, done) {
  const self = this // Fastify context
  done()
})
```
Note: using an arrow function will break the binding of this to the Fastify instance.

<a name="route-hooks"></a>

## Route level hooks
You can declare one or more custom [onRequest](#onRequest), [onReponse](#onResponse), [preParsing](#preParsing), [preValidation](#preValidation), [preHandler](#preHandler) and [preSerialization](#preSerialization) hook(s) that will be **unique** for the route.
If you do so, those hooks are always executed as the last hook in their category. <br/>
This can be useful if you need to implement authentication, where the [preParsing](#preParsing) or [preValidation](#preValidation) hooks are exactly what you need.
Multiple route-level hooks can also be specified as an array.

```js
fastify.addHook('onRequest', (request, reply, done) => {
  // Your code
  done()
})

fastify.addHook('onResponse', (request, reply, done) => {
  // your code
  done()
})

fastify.addHook('preParsing', (request, reply, done) => {
  // Your code
  done()
})

fastify.addHook('preValidation', (request, reply, done) => {
  // Your code
  done()
})

fastify.addHook('preHandler', (request, reply, done) => {
  // Your code
  done()
})

fastify.addHook('preSerialization', (request, reply, payload, done) => {
  // Your code
  done()
})

fastify.route({
  method: 'GET',
  url: '/',
  schema: { ... },
  onRequest: function (request, reply, done) {
    // This hook will always be executed after the shared `onRequest` hooks
    done()
  },
  onResponse: function (request, reply, done) {
    // this hook will always be executed after the shared `onResponse` hooks
    done()
  },
  preParsing: function (request, reply, done) {
    // This hook will always be executed after the shared `preParsing` hooks
    done()
  },
  preValidation: function (request, reply, done) {
    // This hook will always be executed after the shared `preValidation` hooks
    done()
  },
  preHandler: function (request, reply, done) {
    // This hook will always be executed after the shared `preHandler` hooks
    done()
  },
  // // Example with an array. All hooks support this syntax.
  //
  // preHandler: [function (request, reply, done) {
  //   // This hook will always be executed after the shared `preHandler` hooks
  //   done()
  // }],
  preSerialization: (request, reply, payload, done) => {
    // Manipulate the payload
    done(null, payload)
  },
  handler: function (request, reply) {
    reply.send({ hello: 'world' })
  }
})
```

**Note**: both options also accept an array of functions.
