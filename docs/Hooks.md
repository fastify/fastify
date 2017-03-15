<h1 align="center">Fastify</h1>

## Hooks

By using the hooks you can interact directly inside the lifecycle of Fastify, there are three different Hooks that you can use *(in order of execution)*:
- `'onRequest'`
- `'preRouting'`
- `'preHandler'`

Example:
```js
fastify.addHook('onRequest', (req, res, next) => {
  // some code
  next()
})
```

Is pretty easy understand where each hook is executed, if you need a visual feedback take a look to the [lifecycle](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md) page.

If you get an error during the execution of you hook, just pass it to `next()` and Fastify will automatically close the request and send the appropriate error code to the user.

The function signature is always the same, `request`, `response`, `next`, it changes a little bit only in the `'preHandler'` hook, where the first two arguments are [`request`](https://github.com/fastify/fastify/blob/master/docs/Request.md) and [`reply`](https://github.com/fastify/fastify/blob/master/docs/Reply.md) core Fastify objects.

You can add more than one function to every hook and as all the others, the api is chainable.
