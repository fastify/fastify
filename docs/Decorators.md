<h1 align="center">Fastify</h1>

## Decorators

If you need to add functionalities to the Fastify instance, the `decorate` api is what you need.

This api allows you to add new properties to the Fastify instance, a property value is not restricted to be a function, could also be an object or a string for example.

<a name="usage"></a>
### Usage
<a name="decorate"></a>
**decorate**  
Just call the `decorate` api and pass the name of the new property and its value.
```js
fastify.decorate('utility', () => {
  // something very useful
})
```
As said above, you can decorate the instance with other values and not only functions:
```js
fastify.decorate('conf', {
  db: 'some.db',
  port: 3000
})
```
Once you decorate the instance you can access the value every time you need by using the name you passed as parameter:
```js
fastify.utility()

console.log(fastify.conf.db)
```
Decorators are not *overwritable*, if you try to declare a decorator already declared *(in other words, use the same name)*, `decorate` will throw an exception.

<a name="decorate-reply"></a>
**decorateReply**  
As the name suggest, this api is needed if you want to add new methods to the `Reply` core object.  
Just call the `decorateReply` api and pass the name of the new property and its value.
```js
fastify.decorateReply('utility', () => {
  // something very useful
})
```

<a name="decorate-request"></a>
**decorateRequest**  
As above, this api is needed if you want to add new methods to the `Request` core object.  
Just call the `decorateRequest` api and pass the name of the new property and its value.
```js
fastify.decorateRequest('utility', () => {
  // something very useful
})
```

<a name="sync-async"></a>
#### Sync and Async
`decorate` is a *synchronous* API, if you need to add a decorator that has an *asynchronous* bootstrap, could happen that Fastify boots up before that your decorator is ready. To avoid this issue you must use `register` api in combination with `fastify-plugin`, to know more check out the [Plugins](https://github.com/fastify/fastify/blob/master/docs/Plugins.md) documentation as well.

<a name="dependencies"></a>
#### Dependencies
If your decorator depends on another decorator, you can also declare the dependencies of your function, it pretty easy. You just need to add an array of strings (representing the names of the decorators you are depending on) as third parameter.
```js
fastify.decorate('utility', fn, ['greet', 'log'])
```

If a dependency is not satisfied, `decorate` will throw an exception, but don't worry, the dependency check is done before the server boot up, so it will never happen at runtime.

<a name="has-decorator"></a>
#### hasDecorator
You can check the presence of a decorator by using the `hasDecorator` api:
```js
fastify.hasDecorator('utility')
```
