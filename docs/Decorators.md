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

<a name="extend-server-error"></a>
**extendServerError**
If you need to extend the standard [server error](https://github.com/fastify/fastify/blob/master/docs/Reply.md#errors), this API is what you need. You *must* pass a function that returns an object, and Fastify will extend the server error with the object returned by your function. The function will receive the original error object:
```js
fastify.extendServerError((err) => {
  return {
    timestamp: new Date()
  }
})

/*
  The resulting object will be:
  {
    error: String
    message: String
    statusCode: Number
    timestamp: Date
  }
*/
```

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
