<h1 align="center">Fastify</h1>

# The hitchhiker's guide to plugins
First of all, `DON'T PANIC`!

Fastify has been built since the beginning to be an extremely modular system, we built a powerful api that allows you to add methods and utilities to Fastify by creating a namespace, we built a system that creates an encapsulation model that allows you to split you application in multiple microservices at any moment, without the need to refactor the entire application.

**Table of contents**
- [Register](#register)
- [Decorators](#decorators)
- [Hooks](#hooks)
- [Middlewares](#middlewares)
- [How to handle encapsulation and distribution](#distribution)
- [Let's start!](#start)

<a name="register"></a>
## Register
As in JavaScript everything is an object, in Fastify everything is a plugin.  
Your routes, your utilities and so on are all plugins. And to add a new plugin, whatever its functionality is, in Fastify you have a nice and unique api to use: [`register`](https://github.com/fastify/fastify/blob/master/docs/Plugins.md).
```js
fastify.register(
  require('./my-plugin'),
  { options },
  callback
)
```
`register` creates for you a new Fastify context, this means that if you do any change to the Fastify instance, that change(s) will not be reflected into the context's ancestors. In other words, encapsulation!


*Why encapsulation is important?*  
Well, let's say you are creating a new disruptive startup, what do you do? You create an api server with all your stuff, everything in the same place, a monolith!  
Ok, you are growing very fast and you want to change your architecture and try microservices. Usually this implies an huge amount of work, because of cross dependencies and the lack of separation of concerns.  
Fastify helps you a lot in this direction, because thanks to the encapsulation model it will completely avoid cross dependencies, and will help you structure your code in cohesive blocks.

*Let's return to how to use correctly `register`.*  
As you probably know, the required plugins must expose a single function with the following signature
```js
module.exports = function (fastify, options, next) {}
```
Where `fastify` is (pretty obvious) the encapsulated Fastify instance, `options` is the options object and `next` is the function you **must** call when you plugin is ready.

The Fastify's plugin model is fully reentrant and graph-based, it handles without any kind of problem asynchronous code and it guarantees the load order of the plugins, even the close order! *How?* Glad you asked, checkout [`avvio`](https://github.com/mcollina/avvio)!

Inside a plugin you can do whatever you want, register routes, utilities (we'll see this in a moment) and do nested registers, just remember to call `next` when everything is set up!
```js
module.exports = function (fastify, options, next) {
  fastify.get('/plugin', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  next()
}
```

Well, now you know how to use the `register` api and how it works, but how add new functionalities to fastify and even better, share them with other developers?

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
And now you will import your utility in every file you need it. (and don't forget that probably you will need it also in your test).

Fastify offers you a way nicer and elegant way to do this, *decorators*.
Create a decorator is extremely easy, just use the [`decorate`](https://github.com/fastify/fastify/blob/master/docs/Decorators.md) api:
```js
fastify.decorate('util', (a, b) => a + b)
```
Now you can access your utility just by doing `fastify.util` whenever you need it, even inside your test.  
And here's starts the magic; do you remember that few lines above we talked about encapsulation? Well, use `register` and `decorate` in conjunction enable exactly that, let me show you an example to clarify this:
```js
fastify.register((instance, opts, next) => {
  instance.decorate('util', (a, b) => a + b)
  console.log(instance.util('that is ', ' awesome'))

  next()
})

fastify.register((instance, opts, next) => {
  console.log(instance.util('that is ', ' awesome')) // this will throw an error

  next()
})
```
Inside the second register call `instance.util` will throw an error, because `util` exist only inside the first register context.  
Let's step back for a moment and get deepen on this: when using the `register` api you will create a new context every time and this avoid situations like the one mentioned few line above. But pay attention, the encapsulation works only for the ancestors and the brothers, but not for the sons.
```js
fastify.register((instance, opts, next) => {
  instance.decorate('util', (a, b) => a + b)
  console.log(instance.util('that is ', ' awesome'))

  fastify.register((instance, opts, next) => {
    console.log(instance.util('that is ', ' awesome')) // this will not throw an error
    next()
  })

  next()
})

fastify.register((instance, opts, next) => {
  console.log(instance.util('that is ', ' awesome')) // this will throw an error

  next()
})
```
*Take home message: if you need that an utility is available in every part of your application, pay attention that is declared at the root scope of your application. Otherwise you can use `fastify-plugin` utility as described [here](#distribution).*

`decorate` is not the unique api that you can use to extend the server functionalities, you can also use `decorateRequest` and `decorateReply`.

*`decorateRequest` and `decorateReply`? Why do we need them if we already have `decorate`?*  
Good question, we added them to make Fastify more developer-friendly. Let's see an example:
```js
fastify.decorate('html', payload => {
  return generateHtml(payload)
})

fastify.get('/html', (req, reply) => {
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

fastify.get('/html', (req, reply) => {
  reply.html({ hello: 'world' })
})
```

And in the same way you can do this for the `request` object:
```js
fastify.decorate('getHeader', (req, header) => {
  return req.headers[header]
})

fastify.addHook('preHandler', (req, reply, done) => {
  req.isHappy = fastify.getHeader(req.req, 'happy')
  done()
})

fastify.get('/happiness', (req, reply) => {
  reply.send({ happy: req.isHappy })
})
```
Again, it works, but it can be way better!
```js
fastify.decorateRequest('setHeader', function (header) {
  this.isHappy = this.req.headers[header]
})

fastify.decorateRequest('isHappy', false) // this will be added to the Request object prototype, yay speed!

fastify.addHook('preHandler', (req, reply, done) => {
  req.setHeader('happy')
  done()
})

fastify.get('/happiness', (req, reply) => {
  reply.send({ happy: req.isHappy })
})
```

We've seen how extend server functionalities and how handle the encapsulation system, but what if you need to add a function that must be executed every time that the server "[emits](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md)" an event?

<a name="hooks"></a>
## Hooks
You just built an amazing utility, but now you need to execute that for every request, this is what you will likely do:
```js
fastify.decorate('util', (req, key, value) => { req.key = value })

fastify.get('/plugin1', (req, reply) => {
  fastify.util(req, 'timestamp', new Date())
  reply.send(req)
})

fastify.get('/plugin2', (req, reply) => {
  fastify.util(req, 'timestamp', new Date())
  reply.send(req)
})
```
I think we all agree that this is terrible. Code repeat, awful readability and it cannot scale.

So what can you do to avoid this annoying issue? Yes, you are right, use an [hook](https://github.com/fastify/fastify/blob/master/docs/Hooks.md)!  
```js
fastify.decorate('util', (req, key, value) => { req.key = value })

fastify.addHook('preHandler', (req, reply, done) => {
  fastify.util(req, 'timestamp', new Date())
  done()
})

fastify.get('/plugin1', (req, reply) => {
  reply.send(req)
})

fastify.get('/plugin2', (req, reply) => {
  reply.send(req)
})
```
Now for every request you will run your utility, it is obvious that you can register as many hooks as you need.  
It can happen that you want that a hook must be executed just for a subset of routes, how can you do that?  Yep, encapsulation!

```js
fastify.register((instance, opts, next) => {
  instance.decorate('util', (req, key, value) => { req.key = value })

  instance.addHook('preHandler', (req, reply, done) => {
    instance.util(req, 'timestamp', new Date())
    done()
  })

  instance.get('/plugin1', (req, reply) => {
    reply.send(req)
  })

  next()
})

fastify.get('/plugin2', (req, reply) => {
  reply.send(req)
})
```
Now your hook will run just for the first route!

As you probably noticed at this time, `request` and `reply` are not the standard Nodejs *request* and *response* objects, but Fastify's objects.  
Let's say that you are arriving from a framework like Express or Restify, and you already have some Middleware that do exactly what you need, and you don't want to redo al the work.

<a name="middlewares"></a>
## Middlewares
Fastify [supports](https://github.com/fastify/fastify/blob/master/docs/Middlewares.md) out of the box Express/Restify/Connect middlewares, this means that you can just drop-in your old code and it will work! *(faster, by the way)*  
How we can do that? Checkout our middlewares engine, [middie](https://github.com/fastify/middie).
```js
const yourMiddleware = require('your-middleware')
fastify.use(yourMiddleware)
```

<a name="distribution"></a>
## How to handle encapsulation and distribution
Perfect, now you know (almost) all the tools that you can use to extend Fastify. But probably there is something you noted when trying out your code.  
How can you distribute your code?

The preferred way to distribute an utility is to wrap all your code inside a `register`, in this way your plugin can support an asynchronous bootstrap *(since `decorate` is a synchronous api)*, in the case of a database connection for example.

*Wait, what? Don't you told me that `register` creates and encapsulation and what I create inside there will not be available outside?*  
Yes, I told that. But what I didn't told you, is that you can tell to Fastify to avoid this behavior, with the [`fastify-plugin`](https://github.com/fastify/fastify-plugin) module.
```js
const fp = require('fastify-plugin')
const dbClient = require('db-client')

function dbPlugin (fastify, opts, next) {
  dbClient.connect(opts.url, (err, conn) => {
    fastify.decorate('db', conn)
    next()
  })
}

module.exports = fp(dbPlugin)
```
You can also tell to `fastify-plugin` to check the installed version of Fastify, in case of you need a specific api.

<a name="start"></a>
## Let's start!
Awesome, now you know everything you need to know about Fastify and its plugin system to start build your first plugin, and please if you do, tell us! We will add it to the [*ecosystem*](https://github.com/fastify/fastify#ecosystem) section of our documentation!

If you want to see some real world example, checkout:
- [`point-of-view`](https://github.com/fastify/point-of-view)
Templates rendering (*ejs, pug, handlebars, marko*) plugin support for Fastify.
- [`fastify-mongodb`](https://github.com/fastify/fastify-mongodb)
Fastify MongoDB connection plugin, with this you can share the same MongoDb connection pool in every part of your server.
- [`fastify-multipart`](https://github.com/fastify/fastify-multipart)
Multipart support for Fastify
- [`fastify-helmet`](https://github.com/fastify/fastify-helmet) Important security headers for Fastify


*Do you feel it's missing something here? Let us know! :)*
