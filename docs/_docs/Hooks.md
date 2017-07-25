---
title: Hooks
permalink: /docs/hooks/
github_url: https://github.com/fastify/fastify/docs/_docs/Hooks.md
---

By using the hooks you can interact directly inside the lifecycle of Fastify, there are three different Hooks that you can use *(in order of execution)*:
- `'onRequest'`
- `'preRouting'`
- `'preHandler'`
- `'onClose'`

Example:
```js
fastify.addHook('onRequest', (req, res, next) => {
  // some code
  next()
})
```

Is pretty easy understand where each hook is executed, if you need a visual feedback take a look to the [lifecycle]({{ "/docs/lifecycle/" | relative_url }}) page.

If you get an error during the execution of you hook, just pass it to `next()` and Fastify will automatically close the request and send the appropriate error code to the user.

If you want to pass a custom error code to the user, just pass it as second parameter to `next()`:
```js
fastify.addHook('onRequest', (req, res, next) => {
  // some code
  next(new Error('some error'), 400)
})
```
*The error will be handled by [`Reply`]({{ "/docs/reply/" | relative_url | append: "#errors" }}).*

The function signature is always the same, `request`, `response`, `next`, it changes a little bit only in the `'preHandler'` hook, where the first two arguments are [`request`]({{ "/docs/request/" | relative_url }}) and [`reply`]({{ "/docs/reply/" | relative_url }}) core Fastify objects.

<a name="on-close"></a>
**'onClose'**  
The unique hook that is not inside the lifecycle is `'onClose'`, this one is triggered when you call `fastify.close()` to stop the server, and it is useful if you have some [plugins]({{ "/docs/plugins/" | relative_url }}) that need a "shutdown" part, such as a connection to a database.  
Only for this hook, the parameters of the function changes, the first one is the Fastify instance, the second one the `done` callback.
```js
fastify.addHook('onClose', (instance, done) => {
  // some code
  done()
})
```
<a name="scope"></a>
### Scope
Talking about scope, the hooks works in a slightly different way from the Request/Reply encapsulation model. For instance, `onRequest`, `preRouting` and `onClose` are never encapsulated, not matter where you are declaring them, while the `preHandler` hook is always encapsulated if you declare it inside a `register`.

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
