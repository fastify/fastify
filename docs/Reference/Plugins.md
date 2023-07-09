<h1 align="center">Fastify</h1>

## Plugins
Fastify allows the user to extend its functionalities with plugins. A plugin can
be a set of routes, a server [decorator](./Decorators.md), or whatever. The API
that you will need to use one or more plugins, is `register`.

By default, `register` creates a *new scope*, this means that if you make some
changes to the Fastify instance (via `decorate`), this change will not be
reflected by the current context ancestors, but only by its descendants. This
feature allows us to achieve plugin *encapsulation* and *inheritance*, in this
way we create a *directed acyclic graph* (DAG) and we will not have issues
caused by cross dependencies.

You may have already seen in the [Getting
Started](../Guides/Getting-Started.md#your-first-plugin) guide how easy it is
to use this API:
```
fastify.register(plugin, [options])
```

### Plugin Options
<a id="plugin-options"></a>

The optional `options` parameter for `fastify.register` supports a predefined
set of options that Fastify itself will use, except when the plugin has been
wrapped with [fastify-plugin](https://github.com/fastify/fastify-plugin). This
options object will also be passed to the plugin upon invocation, regardless of
whether or not the plugin has been wrapped. The currently supported list of
Fastify specific options is:

+ [`logLevel`](./Routes.md#custom-log-level)
+ [`logSerializers`](./Routes.md#custom-log-serializer)
+ [`prefix`](#route-prefixing-option)

**Note: Those options will be ignored when used with fastify-plugin**

It is possible that Fastify will directly support other options in the future.
Thus, to avoid collisions, a plugin should consider namespacing its options. For
example, a plugin `foo` might be registered like so:

```js
fastify.register(require('fastify-foo'), {
  prefix: '/foo',
  foo: {
    fooOption1: 'value',
    fooOption2: 'value'
  }
})
```

If collisions are not a concern, the plugin may simply accept the options object
as-is:

```js
fastify.register(require('fastify-foo'), {
  prefix: '/foo',
  fooOption1: 'value',
  fooOption2: 'value'
})
```

The `options` parameter can also be a `Function` that will be evaluated at the
time the plugin is registered while giving access to the Fastify instance via
the first positional argument:

```js
const fp = require('fastify-plugin')

fastify.register(fp((fastify, opts, done) => {
  fastify.decorate('foo_bar', { hello: 'world' })

  done()
}))

// The opts argument of fastify-foo will be { hello: 'world' }
fastify.register(require('fastify-foo'), parent => parent.foo_bar)
```

The Fastify instance passed on to the function is the latest state of the
**external Fastify instance** the plugin was declared on, allowing access to
variables injected via [`decorate`](./Decorators.md) by preceding plugins
according to the **order of registration**. This is useful in case a plugin
depends on changes made to the Fastify instance by a preceding plugin i.e.
utilizing an existing database connection to wrap around it.

Keep in mind that the Fastify instance passed on to the function is the same as
the one that will be passed into the plugin, a copy of the external Fastify
instance rather than a reference. Any usage of the instance will behave the same
as it would if called within the plugins function i.e. if `decorate` is called,
the decorated variables will be available within the plugins function unless it
was wrapped with [`fastify-plugin`](https://github.com/fastify/fastify-plugin).

#### Route Prefixing option
<a id="route-prefixing-option"></a>

If you pass an option with the key `prefix` with a `string` value, Fastify will
use it to prefix all the routes inside the register, for more info check
[here](./Routes.md#route-prefixing).

Be aware that if you wrap your routes with
[`fastify-plugin`](https://github.com/fastify/fastify-plugin), this option will
not work (there is a [workaround](./Routes.md#fastify-plugin) available).

#### Error handling
<a id="error-handling"></a>

The error handling is done by
[avvio](https://github.com/mcollina/avvio#error-handling).

As a general rule, it is highly recommended that you handle your errors in the
next `after` or `ready` block, otherwise you will get them inside the `listen`
callback.

```js
fastify.register(require('my-plugin'))

// `after` will be executed once
// the previous declared `register` has finished
fastify.after(err => console.log(err))

// `ready` will be executed once all the registers declared
// have finished their execution
fastify.ready(err => console.log(err))

// `listen` is a special ready,
// so it behaves in the same way
fastify.listen({ port: 3000 }, (err, address) => {
  if (err) console.log(err)
})
```

### async/await
<a id="async-await"></a>

*async/await* is supported by `after`, `ready`, and `listen`, as well as
`fastify` being a [Thenable](https://promisesaplus.com/).

```js
await fastify.register(require('my-plugin'))

await fastify.after()

await fastify.ready()

await fastify.listen({ port: 3000 })
```
*Note: Using `await` when registering a plugin loads the plugin
and the underlying dependency tree, "finalizing" the encapsulation process.
Any mutations to the plugin after it and its dependencies have been
loaded will not be reflected in the parent instance.*

#### ESM support
<a id="esm-support"></a>

ESM is supported as well from [Node.js
`v13.3.0`](https://nodejs.org/api/esm.html) and above!

```js
// main.mjs
import Fastify from 'fastify'
const fastify = Fastify()

fastify.register(import('./plugin.mjs'))

fastify.listen({ port: 3000 }, console.log)


// plugin.mjs
async function plugin (fastify, opts) {
  fastify.get('/', async (req, reply) => {
    return { hello: 'world' }
  })
}

export default plugin
```

### Create a plugin
<a id="create-plugin"></a>

Creating a plugin is very easy, you just need to create a function that takes
three parameters, the `fastify` instance, an `options` object, and the `done`
callback.

Example:
```js
module.exports = function (fastify, opts, done) {
  fastify.decorate('utility', function () {})

  fastify.get('/', handler)

  done()
}
```
You can also use `register` inside another `register`:
```js
module.exports = function (fastify, opts, done) {
  fastify.decorate('utility', function () {})

  fastify.get('/', handler)

  fastify.register(require('./other-plugin'))

  done()
}
```
Sometimes, you will need to know when the server is about to close, for example,
because you must close a connection to a database. To know when this is going to
happen, you can use the [`'onClose'`](./Hooks.md#on-close) hook.

Do not forget that `register` will always create a new Fastify scope, if you do
not need that, read the following section.

### Handle the scope
<a id="handle-scope"></a>

If you are using `register` only for extending the functionality of the server
with  [`decorate`](./Decorators.md), it is your responsibility to tell Fastify
not to create a new scope. Otherwise, your changes will not be accessible by the
user in the upper scope.

You have two ways to tell Fastify to avoid the creation of a new context:
- Use the [`fastify-plugin`](https://github.com/fastify/fastify-plugin) module
- Use the `'skip-override'` hidden property

We recommend using the `fastify-plugin` module, because it solves this problem
for you, and you can pass a version range of Fastify as a parameter that your
plugin will support.
```js
const fp = require('fastify-plugin')

module.exports = fp(function (fastify, opts, done) {
  fastify.decorate('utility', function () {})
  done()
}, '0.x')
```
Check the [`fastify-plugin`](https://github.com/fastify/fastify-plugin)
documentation to learn more about how to use this module.

If you do not use the `fastify-plugin` module, you can use the `'skip-override'`
hidden property, but we do not recommend it. If in the future the Fastify API
changes it will be your responsibility to update the module, while if you use
`fastify-plugin`, you can be sure about backward compatibility.
```js
function yourPlugin (fastify, opts, done) {
  fastify.decorate('utility', function () {})
  done()
}
yourPlugin[Symbol.for('skip-override')] = true
module.exports = yourPlugin
```
