<h1 align="center">Fastify</h1>

## Hooks

By using the hooks you can interact directly inside the lifecycle of Fastify. There are five different Hooks that you can use *(in order of execution)*:
- `'onRequest'`
- `'preHandler'`
- `'onSend'`
- `'onResponse'`
- `'onClose'`

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

| Parameter   |  Description  |
|-------------|-------------|
| req |  Node.js [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) |
| res | Node.js [ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse) |
| request | Fastify [Request](https://github.com/fastify/fastify/blob/master/docs/Request.md) interface |
| reply | Fastify [Reply](https://github.com/fastify/fastify/blob/master/docs/Reply.md) interface |
| next | Function to continue with the [lifecycle](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md) |

It is pretty easy to understand where each hook is executed by looking at the [lifecycle page](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md).  
Hooks are affected by Fastify's encapsulation, and can thus be applied to selected routes. See the [Scopes](#scope) section for more information.

If you get an error during the execution of you hook, just pass it to `next()` and Fastify will automatically close the request and send the appropriate error code to the user.

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

If you are using the `onSend` hook you can update the payload, for example:
```js

fastify.addHook('onSend', (request, reply, payload, next) => {
  var err = null;
  payload.hello = 'world'
  next(err, payload)
})

// Or
fastify.addHook('onSend', (request, reply, payload, next) => {
  var err = null;
  var newPayload = payload.replace('some-text', 'some-new-text')
  next(err, newPayload)
})
```

<a name="on-close"></a>
**'onClose'**  
The unique hook that is not inside the lifecycle is `'onClose'`, this one is triggered when you call `fastify.close()` to stop the server, and it is useful if you have some [plugins](https://github.com/fastify/fastify/blob/master/docs/Plugins.md) that need a "shutdown" part, such as a connection to a database.  
Only for this hook, the parameters of the function changes, the first one is the Fastify instance, the second one the `done` callback.
```js
fastify.addHook('onClose', (instance, done) => {
  // some code
  done()
})
```
<a name="scope"></a>
### Scope
Except for `'onClose'` all the hooks are encapsulated this means that you can decide where your hooks should run by using `register` as explained in the [plugins guide](https://github.com/fastify/fastify/blob/master/docs/Plugins-Guide.md). If you pass a function, that function is bound to the right Fastify context and from there you have full access to the Fastify api.

```js
fastify.addHook('onRequest', function (req, res, next) {
  const self = this // Fastify context
  next()
})
```
Note: using an arrow function will break the binding of this to the Fastify instance.

<a name="before-handler"></a>
### beforeHandler
Despite the name, `beforeHandler` is not a standard hook like `preHandler`, but is a function that your register right in the route option that will be executed only in the specified route. Can be useful if you need to handle the authentication at route level instead of at hook level (`preHandler` for example.), it could also be an array of functions.  
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
