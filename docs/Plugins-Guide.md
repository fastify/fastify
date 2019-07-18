<h1 align="center">Fastify</h1>

# The hitchhiker's guide to plugins
First of all, `DON'T PANIC`!

Fastify was built from the beginning to be an extremely modular system. We built a powerful API that allows you to add methods and utilities to Fastify by creating a namespace. We built a system that creates an encapsulation model that allows you to split your application in multiple microservices at any moment, without the need to refactor the entire application.

**Table of contents**
- [Register](#register)
- [Decorators](#decorators)
- [Hooks](#hooks)
- [Middlewares](#middlewares)
- [How to handle encapsulation and distribution](#distribution)
- [Handle errors](#handle-errors)
- [Let's start!](#start)

<a name="register"></a>
## Register
As in JavaScript everything is an object, in Fastify everything is a plugin.<br>
Your routes, your utilities and so on are all plugins. To add a new plugin, whatever its functionality is, in Fastify you have a nice and unique api to use: [`register`](https://github.com/fastify/fastify/blob/master/docs/Plugins.md).
```js
fastify.register(
  require('./my-plugin'),
  { options }
)
```
`register` creates a new Fastify context, this means that if you do any change to the Fastify instance, those changes will not be reflected in the context's ancestors. In other words, encapsulation!


*Why is encapsulation important?*<br>
Well, let's say you are creating a new disruptive startup, what do you do? You create an api server with all your stuff, everything in the same place, a monolith!<br>
Ok, you are growing very fast and you want to change your architecture and try microservices. Usually this implies a huge amount of work, because of cross dependencies and the lack of separation of concerns.<br>
Fastify helps you a lot in this direction, because thanks to the encapsulation model it will completely avoid cross dependencies, and will help you structure your code in cohesive blocks.

*Let's return to how to correctly use `register`.*<br>
As you probably know, the required plugins must expose a single function with the following signature
```js
module.exports = function (fastify, options, done) {}
```
Where `fastify` is (pretty obvious) the encapsulated Fastify instance, `options` is the options object and `done` is the function you **must** call when your plugin is ready.

Fastify's plugin model is fully reentrant and graph-based, it handles without any kind of problem asynchronous code and it guarantees the load order of the plugins, even the close order! *How?* Glad you asked, checkout [`avvio`](https://github.com/mcollina/avvio)! Fastify starts loading the plugin __after__ `.listen()`, `.inject()` or `.ready()` are called.

Inside a plugin you can do whatever you want, register routes, utilities (we'll see this in a moment) and do nested registers, just remember to call `done` when everything is set up!
```js
module.exports = function (fastify, options, done) {
  fastify.get('/plugin', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  done()
}
```

Well, now you know how to use the `register` api and how it works, but how do we add new functionality to Fastify and even better, share them with other developers?

<a name="decorators"></a>
## Decorators
Okay, let's say that you wrote an utility that is so good that you decided to make it available along all your code. How would you do it? Probably something like the following:
```js
// your-awesome-utility.js
module.exports = function (a, b) {
  return a + b
}
```
```js
const util = require('./your-awesome-utility')
console.log(util('that is ', ' awesome'))
```
And now you will import your utility in every file you need it. (And don't forget that you will probably also need it in your test).

Fastify offers you a way nicer and elegant way to do this, *decorators*.
Create a decorator is extremely easy, just use the [`decorate`](https://github.com/fastify/fastify/blob/master/docs/Decorators.md) api:
```js
fastify.decorate('util', (a, b) => a + b)
```
Now you can access your utility just by doing `fastify.util` whenever you need it, even inside your test.<br>
And here's starts the magic; do you remember that few lines above we talked about encapsulation? Well, using `register` and `decorate` in conjunction enable exactly that, let me show you an example to clarify this:
```js
fastify.register((instance, opts, done) => {
  instance.decorate('util', (a, b) => a + b)
  console.log(instance.util('that is ', ' awesome'))

  done()
})

fastify.register((instance, opts, done) => {
  console.log(instance.util('that is ', ' awesome')) // this will throw an error

  done()
})
```
Inside the second register call `instance.util` will throw an error, because `util` exists only inside the first register context.<br>
Let's step back for a moment and get deeper on this: when using the `register` api you will create a new context every time and this avoids situations like the one mentioned few line above. But pay attention, the encapsulation works only for the ancestors and the brothers, but not for the sons.
```js
fastify.register((instance, opts, done) => {
  instance.decorate('util', (a, b) => a + b)
  console.log(instance.util('that is ', ' awesome'))

  fastify.register((instance, opts, done) => {
    console.log(instance.util('that is ', ' awesome')) // this will not throw an error
    done()
  })

  done()
})

fastify.register((instance, opts, done) => {
  console.log(instance.util('that is ', ' awesome')) // this will throw an error

  done()
})
```
*Take home message: if you need that an utility is available in every part of your application, pay attention that is declared at the root scope of your application. Otherwise you can use `fastify-plugin` utility as described [here](#distribution).*

`decorate` is not the unique api that you can use to extend the server functionalities, you can also use `decorateRequest` and `decorateReply`.

*`decorateRequest` and `decorateReply`? Why do we need them if we already have `decorate`?*<br>
Good question, we added them to make Fastify more developer-friendly. Let's see an example:
```js
fastify.decorate('html', payload => {
  return generateHtml(payload)
})

fastify.get('/html', (request, reply) => {
  reply
    .type('text/html')
    .send(fastify.html({ hello: 'world' }))
})
```
It works, but it can be way better!
```js
fastify.decorateReply('html', function (payload) {
  this.type('text/html') // this is the 'Reply' object
  this.send(generateHtml(payload))
})

fastify.get('/html', (request, reply) => {
  reply.html({ hello: 'world' })
})
```

And in the same way you can do this for the `request` object:
```js
fastify.decorate('getHeader', (req, header) => {
  return req.headers[header]
})

fastify.addHook('preHandler', (request, reply, done) => {
  request.isHappy = fastify.getHeader(request.raw, 'happy')
  done()
})

fastify.get('/happiness', (request, reply) => {
  reply.send({ happy: request.isHappy })
})
```
Again, it works, but it can be way better!
```js
fastify.decorateRequest('setHeader', function (header) {
  this.isHappy = this.headers[header]
})

fastify.decorateRequest('isHappy', false) // this will be added to the Request object prototype, yay speed!

fastify.addHook('preHandler', (request, reply, done) => {
  request.setHeader('happy')
  done()
})

fastify.get('/happiness', (request, reply) => {
  reply.send({ happy: request.isHappy })
})
```

We've seen how to extend server functionality and how handle the encapsulation system, but what if you need to add a function that must be executed every time that the server "[emits](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md)" an event?

<a name="hooks"></a>
## Hooks
You just built an amazing utility, but now you need to execute that for every request, this is what you will likely do:
```js
fastify.decorate('util', (request, key, value) => { request.key = value })

fastify.get('/plugin1', (request, reply) => {
  fastify.util(request, 'timestamp', new Date())
  reply.send(request)
})

fastify.get('/plugin2', (request, reply) => {
  fastify.util(request, 'timestamp', new Date())
  reply.send(request)
})
```
I think we all agree that this is terrible. Code repeat, awful readability and it cannot scale.

So what can you do to avoid this annoying issue? Yes, you are right, use an [hook](https://github.com/fastify/fastify/blob/master/docs/Hooks.md)!<br>
```js
fastify.decorate('util', (request, key, value) => { request[key] = value })

fastify.addHook('preHandler', (request, reply, done) => {
  fastify.util(request, 'timestamp', new Date())
  done()
})

fastify.get('/plugin1', (request, reply) => {
  reply.send(request)
})

fastify.get('/plugin2', (request, reply) => {
  reply.send(request)
})
```
Now for every request you will run your utility, it is obvious that you can register as many hooks as you need.<br>
It can happen that you want a hook that must be executed just for a subset of routes, how can you do that?  Yep, encapsulation!

```js
fastify.register((instance, opts, done) => {
  instance.decorate('util', (request, key, value) => { request[key] = value })

  instance.addHook('preHandler', (request, reply, done) => {
    instance.util(request, 'timestamp', new Date())
    done()
  })

  instance.get('/plugin1', (request, reply) => {
    reply.send(request)
  })

  done()
})

fastify.get('/plugin2', (request, reply) => {
  reply.send(request)
})
```
Now your hook will run just for the first route!

As you probably noticed at this time, `request` and `reply` are not the standard Nodejs *request* and *response* objects, but Fastify's objects.<br>

<a name="middlewares"></a>
## Middlewares
Fastify [supports](https://github.com/fastify/fastify/blob/master/docs/Middlewares.md) out of the box Express/Restify/Connect middlewares, this means that you can just drop-in your old code and it will work! *(faster, by the way)*<br>
Let's say that you are arriving from Express, and you already have some Middleware that does exactly what you need, and you don't want to redo all the work.
How we can do that? Checkout our middlewares engine, [middie](https://github.com/fastify/middie).
```js
const yourMiddleware = require('your-middleware')
fastify.use(yourMiddleware)
```

<a name="distribution"></a>
## How to handle encapsulation and distribution
Perfect, now you know (almost) all the tools that you can use to extend Fastify. But probably there is something you noted when trying out your code.<br>
How can you distribute your code?

The preferred way to distribute a utility is to wrap all your code inside a `register`, in this way your plugin can support an asynchronous bootstrap *(since `decorate` is a synchronous api)*, in the case of a database connection for example.

*Wait, what? Didn't you tell me that `register` creates an encapsulation and that what I create inside there will not be available outside?*<br>
Yes, I said that. But what I didn't tell you, is that you can tell to Fastify to avoid this behavior, with the [`fastify-plugin`](https://github.com/fastify/fastify-plugin) module.
```js
const fp = require('fastify-plugin')
const dbClient = require('db-client')

function dbPlugin (fastify, opts, done) {
  dbClient.connect(opts.url, (err, conn) => {
    fastify.decorate('db', conn)
    done()
  })
}

module.exports = fp(dbPlugin)
```
You can also tell to `fastify-plugin` to check the installed version of Fastify, in case of you need a specific api.

As we mentioned earlier, Fastify starts loading its plugins __after__ `.listen()`, `.inject()` or `.ready()` are called and as such, __after__ they have been declared. This means that, even though the plugin may inject variables to the external fastify instance via [`decorate`](https://github.com/fastify/fastify/blob/master/docs/Decorators.md), the decorated variables will not be accessible before calling `.listen()`, `.inject()` or `.ready()`.

In case you rely on a variable injected by a preceding plugin and want to pass that in the `options` argument of `register`, you can do so by using a function instead of an object:
```js
const fastify = require('fastify')()
const fp = require('fastify-plugin')
const dbClient = require('db-client')

function dbPlugin (fastify, opts, done) {
  dbClient.connect(opts.url, (err, conn) => {
    fastify.decorate('db', conn)
    done()
  })
}

fastify.register(fp(dbPlugin), { url: 'https://example.com' })
fastify.register(require('your-plugin'), parent => {
  return { connection: parent.db, otherOption: 'foo-bar' }
})
```
In the above example, the `parent` variable of the function passed in as the second argument of `register` is a copy of the **external fastify instance** that the plugin was registered at. This means that we are able to access any variables that were injected by preceding plugins in the order of declaration.

<a name="handle-errors"></a>
## Handle errors
It can happen that one of your plugins could fail during the startup. Maybe you expect it and you have a custom logic that will be triggered in that case. How can you do this?
The `after` api is what you need. `after` simply registers a callback that will be executed just after a register, and it can take up to three parameters.<br>
The callback changes based on the parameters your are giving:

1. If no parameter is given to the callback and there is an error, that error will be passed to the next error handler.
1. If one parameter is given to the callback, that parameter will be the error object.
1. If two parameters are given to the callback, the first will be the error object, the second will be the done callback.
1. If three parameters are given to the callback, the first will be the error object, the second will be the top level context unless you have specified both server and override, in that case the context will be what the override returns, and the third the done callback.

Let's see how to use it:
```js
fastify
  .register(require('./database-connector'))
  .after(err => {
    if (err) throw err
  })
```

<a name="start"></a>
## Let's start!
Awesome, now you know everything you need to know about Fastify and its plugin system to start building your first plugin, and please if you do, tell us! We will add it to the [*ecosystem*](https://github.com/fastify/fastify#ecosystem) section of our documentation!

If you want to see some real world example, checkout:
- [`point-of-view`](https://github.com/fastify/point-of-view)
Templates rendering (*ejs, pug, handlebars, marko*) plugin support for Fastify.
- [`fastify-mongodb`](https://github.com/fastify/fastify-mongodb)
Fastify MongoDB connection plugin, with this you can share the same MongoDb connection pool in every part of your server.
- [`fastify-multipart`](https://github.com/fastify/fastify-multipart)
Multipart support for Fastify
- [`fastify-helmet`](https://github.com/fastify/fastify-helmet) Important security headers for Fastify


*Do you feel it's missing something here? Let us know! :)*
