<h1 align="center">Fastify</h1>

## Plugins
Fastify allows the user to extend its functionalities with plugins.
A plugin can be a set of routes, a server decorator or whatever. The API that you will need to use one or more plugins, is `register`.  
You already see in the [getting started](https://github.com/fastify/fastify/blob/master/docs/Getting-Started.md#register) section how use this API, is pretty straightforward.
```js
fastify.register([
  require('./another-route'),
  require('./yet-another-route')
], opts, function (err) {
  if (err) throw err
})
```

By default, `register` creates a *new scope*, this means that everything you do to the current Fastify instance is not reflected to the current context ancestors, but only to its sons. This feature allows us to achieve plugin *encapsulation* and *inheritance*.


### Use a plugin
Use a plugin is very easy, you just need to require it and pass it as parameter to the `register` API.
You can pass a single plugin or an array of plugins if all of them can share the same options object/callback.

Sometimes you don't want to use the plugin *encapsulation*, in that cases you have two ways to tell Fastify to skip the creation of a new scope:
- Use the [`fastify-plugin`](https://github.com/fastify/fastify-plugin) module.
- Use the `'skip-override'` hidden property

We recommend to use the `fastify-plugin` module.
```js
const fp = require('fastify-plugin')

module.exports = fp(function (fastify, opts, next) {
  // your plugin code
  next()
})
```

### Create a plugin
If you are a plugin creator, this section is for you.
As you probably know, Fastify creates a new scope every time the user uses the `register` API.   
As plugin creator obviously you want that the user can use your code, so you don't need that a new context (or scope) is created.

You have two ways to tell Fastify to avoid the creation of a new context:
- Use the [`fastify-plugin`](https://github.com/fastify/fastify-plugin) module.
- Use the `'skip-override'` hidden property

We recommend to use the `fastify-plugin` module, because it solves this problem for you and you can pass as parameter a version range of Fastify that your plugin support.
```js
const fp = require('fastify-plugin')

module.exports = fp(function (fastify, opts, next) {
  // your plugin code
  next()
}, '0.x')
```
Check the [`fastify-plugin`](https://github.com/fastify/fastify-plugin) documentation to know more about how use this module.

If you won't use the `fastify-plugin` module, you can use the `'skip-override'` hidden property, but we do not recommend it, because if in the future the Fastify API will change, it will be a your responsibility update the module, while if you use `fastify-plugin`, you can be sure about back compatibility.
```js
function yourPlugin (fastify, opts, next) {
  // your plugin code
  next()
}
yourPlugin[Symbol.for('skip-override')] = true
module.exports = yourPlugin
```

If you want to decorate Fastify with new features, check the [decorator](https://github.com/fastify/fastify/blob/master/docs/Decorators.md) API.
```js
const fp = require('fastify-plugin')

module.exports = fp(function (fastify, opts, next) {
  fastify.decorate('utility', () => {})
  next()
})
```
