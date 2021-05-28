<h1 align="center">Fastify</h1>

# The hitchhiker's guide to plugins
First of all, `DON'T PANIC`!

Fastify was built from the beginning to be an extremely modular system. We built a powerful API that allows you to add methods and utilities to Fastify by creating a namespace. We built a system that creates an encapsulation model, which allows you to split your application into multiple microservices at any moment, without the need to refactor the entire application.

**Table of contents**
- [Register](#register)
- [Decorators](#decorators)
- [Hooks](#hooks)
- [How to handle encapsulation and distribution](#distribution)
- [ESM support](#esm-support)
- [Handle errors](#handle-errors)
- [Custom errors](#custom-errors)
- [Emit warnings](#emit-warnings)
- [Let's start!](#start)

<a name="register"></a>
## Register
As with JavaScript, where everything is an object, in Fastify everything is a plugin.<br>
Your routes, your utilities, and so on are all plugins. To add a new plugin, whatever its functionality may be, in Fastify you have a nice and unique API: [`register`](Plugins.md).
```js
fastify.register(
  require('./my-plugin'),
  { options }
)
```
`register` creates a new Fastify context, which means that if you perform any changes on the Fastify instance, those changes will not be reflected in the context's ancestors. In other words, encapsulation!

*Why is encapsulation important?*<br>
Well, let's say you are creating a new disruptive startup, what do you do? You create an API server with all your stuff, everything in the same place, a monolith!<br>
Ok, you are growing very fast and you want to change your architecture and try microservices. Usually, this implies a huge amount of work, because of cross dependencies and a lack of separation of concerns in the codebase.<br>
Fastify helps you in that regard. Thanks to the encapsulation model, it will completely avoid cross dependencies and will help you structure your code into cohesive blocks.

*Let's return to how to correctly use `register`.*<br>
As you probably know, the required plugins must expose a single function with the following signature
```js
module.exports = function (fastify, options, done) {}
```
Where `fastify` is the encapsulated Fastify instance, `options` is the options object, and `done` is the function you **must** call when your plugin is ready.

Fastify's plugin model is fully reentrant and graph-based, it handles asynchronous code without any problems and it enforces both the load and close order of plugins. *How?* Glad you asked, check out [`avvio`](https://github.com/mcollina/avvio)! Fastify starts loading the plugin __after__ `.listen()`, `.inject()` or `.ready()` are called.

Inside a plugin you can do whatever you want, register routes, utilities (we will see this in a moment) and do nested registers, just remember to call `done` when everything is set up!
```js
module.exports = function (fastify, options, done) {
  fastify.get('/plugin', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  done()
}
```

Well, now you know how to use the `register` API and how it works, but how do we add new functionality to Fastify and even better, share them with other developers?

<a name="decorators"></a>
## Decorators
Okay, let's say that you wrote a utility that is so good that you decided to make it available along with all your code. How would you do it? Probably something like the following:
```js
// your-awesome-utility.js
module.exports = function (a, b) {
  return a + b
}
```
```js
const util = require('./your-awesome-utility')
console.log(util('that is ', 'awesome'))
```
Now you will import your utility in every file you need it in. (And do not forget that you will probably also need it in your tests).

Fastify offers you a more elegant and comfortable way to do this, *decorators*.
Creating a decorator is extremely easy, just use the [`decorate`](Decorators.md) API:
```js
fastify.decorate('util', (a, b) => a + b)
```
Now you can access your utility just by calling `fastify.util` whenever you need it - even inside your test.<br>
And here starts the magic; do you remember how just now we were talking about encapsulation? Well, using `register` and `decorate` in conjunction enable exactly that, let me show you an example to clarify this:
```js
fastify.register((instance, opts, done) => {
  instance.decorate('util', (a, b) => a + b)
  console.log(instance.util('that is ', 'awesome'))

  done()
})

fastify.register((instance, opts, done) => {
  console.log(instance.util('that is ', 'awesome')) // This will throw an error

  done()
})
```
Inside the second register call `instance.util` will throw an error because `util` exists only inside the first register context.<br>
Let's step back for a moment and dig deeper into this: every time you use the `register` API, a new context is created which avoids the negative situations mentioned above.

Do note that encapsulation applies to the ancestors and siblings, but not the children.
```js
fastify.register((instance, opts, done) => {
  instance.decorate('util', (a, b) => a + b)
  console.log(instance.util('that is ', 'awesome'))

  fastify.register((instance, opts, done) => {
    console.log(instance.util('that is ', 'awesome')) // This will not throw an error
    done()
  })

  done()
})

fastify.register((instance, opts, done) => {
  console.log(instance.util('that is ', 'awesome')) // This will throw an error

  done()
})
```
*Take home message: if you need a utility that is available in every part of your application, take care that it is declared in the root scope of your application. If that is not an option,  you can use the `fastify-plugin` utility as described [here](#distribution).*

`decorate` is not the only API that you can use to extend the server functionality, you can also use `decorateRequest` and `decorateReply`.

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
It works, but it could be much better!
```js
fastify.decorateReply('html', function (payload) {
  this.type('text/html') // This is the 'Reply' object
  this.send(generateHtml(payload))
})

fastify.get('/html', (request, reply) => {
  reply.html({ hello: 'world' })
})
```

In the same way you can do this for the `request` object:
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
Again, it works, but it can be much better!
```js
fastify.decorateRequest('setHeader', function (header) {
  this.isHappy = this.headers[header]
})

fastify.decorateRequest('isHappy', false) // This will be added to the Request object prototype, yay speed!

fastify.addHook('preHandler', (request, reply, done) => {
  request.setHeader('happy')
  done()
})

fastify.get('/happiness', (request, reply) => {
  reply.send({ happy: request.isHappy })
})
```

We have seen how to extend server functionality and how to handle the encapsulation system, but what if you need to add a function that must be executed every time when the server "[emits](Lifecycle.md)" an event?

<a name="hooks"></a>
## Hooks
You just built an amazing utility, but now you need to execute that for every request, this is what you will likely do:
```js
fastify.decorate('util', (request, key, value) => { request[key] = value })

fastify.get('/plugin1', (request, reply) => {
  fastify.util(request, 'timestamp', new Date())
  reply.send(request)
})

fastify.get('/plugin2', (request, reply) => {
  fastify.util(request, 'timestamp', new Date())
  reply.send(request)
})
```
I think we all agree that this is terrible. Repeated code, awful readability and it cannot scale.

So what can you do to avoid this annoying issue? Yes, you are right, use a [hook](Hooks.md)!<br>
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
Now for every request, you will run your utility. You can register as many hooks as you need.<br>
Sometimes you want a hook that should be executed for just a subset of routes, how can you do that? Yep, encapsulation!

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

As you probably noticed by now, `request` and `reply` are not the standard Nodejs *request* and *response* objects, but Fastify's objects.<br>

<a name="distribution"></a>
## How to handle encapsulation and distribution
Perfect, now you know (almost) all of the tools that you can use to extend Fastify. Nevertheless, chances are that you came across one big issue: how is distribution handled?

The preferred way to distribute a utility is to wrap all your code inside a `register`. Using this, your plugin can support asynchronous bootstrapping *(since `decorate` is a synchronous API)*, in the case of a database connection for example.

*Wait, what? Didn't you tell me that `register` creates an encapsulation and that the stuff I create inside will not be available outside?*<br>
Yes, I said that. However, what I didn't tell you is that you can tell Fastify to avoid this behavior with the [`fastify-plugin`](https://github.com/fastify/fastify-plugin) module.
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
You can also tell `fastify-plugin` to check the installed version of Fastify, in case you need a specific API.

As we mentioned earlier, Fastify starts loading its plugins __after__ `.listen()`, `.inject()` or `.ready()` are called and as such, __after__ they have been declared. This means that, even though the plugin may inject variables to the external Fastify instance via [`decorate`](Decorators.md), the decorated variables will not be accessible before calling `.listen()`, `.inject()` or `.ready()`.

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
In the above example, the `parent` variable of the function passed in as the second argument of `register` is a copy of the **external Fastify instance** that the plugin was registered at. This means that we are able to access any variables that were injected by preceding plugins in the order of declaration.

<a name="esm-support"></a>
## ESM support

ESM is supported as well from [Node.js `v13.3.0`](https://nodejs.org/api/esm.html) and above! Just export your plugin as ESM module and you are good to go!

```js
// plugin.mjs
async function plugin (fastify, opts) {
  fastify.get('/', async (req, reply) => {
    return { hello: 'world' }
  })
}

export default plugin
```
__Note__: Fastify does not support named imports within an ESM context. Instead, the `default` export is available. 

```js
// server.mjs
import Fastify from 'fastify'

const fastify = Fastify()

///...

fastify.listen(3000, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

<a name="handle-errors"></a>
## Handle errors
It can happen that one of your plugins fails during startup. Maybe you expect it and you have a custom logic that will be triggered in that case. How can you implement this?
The `after` API is what you need. `after` simply registers a callback that will be executed just after a register, and it can take up to three parameters.<br>
The callback changes based on the parameters you are giving:

1. If no parameter is given to the callback and there is an error, that error will be passed to the next error handler.
1. If one parameter is given to the callback, that parameter will be the error object.
1. If two parameters are given to the callback, the first will be the error object; the second will be the done callback.
1. If three parameters are given to the callback, the first will be the error object, the second will be the top-level context unless you have specified both server and override, in that case, the context will be what the override returns, and the third the done callback.

Let's see how to use it:
```js
fastify
  .register(require('./database-connector'))
  .after(err => {
    if (err) throw err
  })
```

<a name="custom-errors"></a>
## Custom errors
If your plugin needs to expose custom errors, you can easily generate consistent error objects across your codebase and plugins with the [`fastify-error`](https://github.com/fastify/fastify-error) module.

```js
const createError = require('fastify-error')
const CustomError = createError('ERROR_CODE', 'message')
console.log(new CustomError())
```

<a name="emit-warnings"></a>
## Emit Warnings
If you want to deprecate an API, or you want to warn the user about a specific use case, you can use the [`fastify-warning`](https://github.com/fastify/fastify-warning) module.

```js
const warning = require('fastify-warning')()
warning.create('FastifyDeprecation', 'FST_ERROR_CODE', 'message')
warning.emit('FST_ERROR_CODE')
```

<a name="start"></a>
## Let's start!
Awesome, now you know everything you need to know about Fastify and its plugin system to start building your first plugin, and please if you do, tell us! We will add it to the [*ecosystem*](https://github.com/fastify/fastify#ecosystem) section of our documentation!

If you want to see some real-world examples, check out:
- [`point-of-view`](https://github.com/fastify/point-of-view)
Templates rendering (*ejs, pug, handlebars, marko*) plugin support for Fastify.
- [`fastify-mongodb`](https://github.com/fastify/fastify-mongodb)
Fastify MongoDB connection plugin, with this you can share the same MongoDB connection pool in every part of your server.
- [`fastify-multipart`](https://github.com/fastify/fastify-multipart)
Multipart support for Fastify
- [`fastify-helmet`](https://github.com/fastify/fastify-helmet) Important security headers for Fastify


*Do you feel like something is missing here? Let us know! :)*
