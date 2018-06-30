<h1 align="center">Fastify</h1>

## Decorators

If you need to add functionality to the Fastify instance, the `decorate` API is what you need.

The API allows you to add new properties to the Fastify instance. A value is not restricted to a function and could also be an object or a string, for example.

<a name="usage"></a>
### Usage
<a name="decorate"></a>
**decorate**
Just call the `decorate` API and pass the name of the new property and its value.
```js
fastify.decorate('utility', () => {
  // something very useful
})
```

As said above, you can also decorate the instance with non-function values:
```js
fastify.decorate('conf', {
  db: 'some.db',
  port: 3000
})
```

Once you decorate the instance, you can access the value by using the name you passed as a parameter:
```js
fastify.utility()

console.log(fastify.conf.db)
```

Decorators are not *overwritable*. If you try to declare a decorator that was previously declared *(in other words, use the same name)*, `decorate` will throw an exception.

Decorators accept special "getter/setter" objects. These objects have functions named `getter` and `setter` (though, the `setter` function is optional). This allows defining properties via decorators. For example:

```js
fastify.decorate('foo', {
  getter () {
    return 'a getter'
  }
})
```

Will define the `foo` property on the *Fastify* instance:

```js
console.log(fastify.foo) // 'a getter'
```

<a name="decorate-reply"></a>
**decorateReply**
As the name suggests, this API is needed if you want to add new methods to the `Reply` core object. Just call the `decorateReply` API and pass the name of the new property and its value:
```js
fastify.decorateReply('utility', function () {
  // something very useful
})
```

Note: using an arrow function will break the binding of `this` to the Fastify `reply` instance.

<a name="decorate-request"></a>
**decorateRequest**
As above, this API is needed if you want to add new methods to the `Request` core object. Just call the `decorateRequest` API and pass the name of the new property and its value:
```js
fastify.decorateRequest('utility', function () {
  // something very useful
})
```

Note: using an arrow function will break the binding of `this` to the Fastify `request` instance.

<a name="usage_notes"></a>
#### Usage Notes
`decorateReply` and `decorateRequest` are used to modify the `Reply` and `Request` constructors respectively by adding methods or properties. To update these properties you should directly access the desired property of the `Reply` or `Request` object.

As an example let's add a user property to the `Request` object:

```js
// Decorate request with a 'user' property
fastify.decorateRequest('user', '')

// Update our property
fastify.addHook('preHandler', (req, reply, next) => {
  req.user = 'Bob Dylan'
  next()
})
// And finally access it
fastify.get('/', (req, reply) => {
  reply.send(`Hello ${req.user}!`)
})
```
Note: The usage of `decorateReply` and `decorateRequest` is optional in this case but will allow Fastify to optimize for performance.

<a name="sync-async"></a>
#### Sync and Async
`decorate` is a *synchronous* API. If you need to add a decorator that has an *asynchronous* bootstrap, Fastify could boot up before your decorator is ready. To avoid this issue, you must use the `register` API in combination with `fastify-plugin`. To learn more, check out the [Plugins](https://github.com/fastify/fastify/blob/master/docs/Plugins.md) documentation as well.

<a name="dependencies"></a>
#### Dependencies
If your decorator depends on another decorator, you can easily declare the other decorator as a dependency. You just need to add an array of strings (representing the names of the decorators on which yours depends) as the third parameter:
```js
fastify.decorate('utility', fn, ['greet', 'log'])
```

If a dependency is not satisfied, `decorate` will throw an exception, but don't worry: the dependency check is executed before the server boots up, so it won't ever happen at runtime.

<a name="has-decorator"></a>
#### hasDecorator
You can check for the presence of a decorator with the `hasDecorator` API:
```js
fastify.hasDecorator('utility')
```

<a name="has-request-decorator"></a>
#### hasRequestDecorator
You can check for the presence of a Request decorator with the `hasRequestDecorator` API:
```js
fastify.hasRequestDecorator('utility')
```

<a name="has-reply-decorator"></a>
#### hasReplyDecorator
You can check for the presence of a Reply decorator with the `hasReplyDecorator` API:
```js
fastify.hasReplyDecorator('utility')
```
