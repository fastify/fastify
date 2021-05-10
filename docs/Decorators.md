<h1 align="center">Fastify</h1>

## Decorators

The decorators API allows customization of the core Fastify objects, such as
the server instance itself and any request and reply objects used during the
HTTP request lifecycle. The decorators API can be used to attach any type of
property to the core objects, e.g. functions, plain objects, or native types.

This API is *synchronous*. Attempting to define a decoration
asynchronously could result in the Fastify instance booting before the
decoration completes its initialization. To avoid this issue, and register an
asynchronous decoration, the `register` API, in combination with
`fastify-plugin`, must be used instead. To learn more, see the
[Plugins](Plugins.md) documentation.

Decorating core objects with this API allows the underlying JavaScript engine
to optimize the handling of server, request, and reply objects. This is
accomplished by defining the shape of all such object instances before they are
instantiated and used. As an example, the following is not recommended because
it will change the shape of objects during their lifecycle:

```js
// Bad example! Continue reading.

// Attach a user property to the incoming request before the request
// handler is invoked.
fastify.addHook('preHandler', function (req, reply, done) {
  req.user = 'Bob Dylan'
  done()
})

// Use the attached user property in the request handler.
fastify.get('/', function (req, reply) {
  reply.send(`Hello, ${req.user}`)
})
```

Since the above example mutates the request object after it has already
been instantiated, the JavaScript engine must deoptimize access to the request
object. By using the decoration API this deoptimization is avoided:

```js
// Decorate request with a 'user' property
fastify.decorateRequest('user', '')

// Update our property
fastify.addHook('preHandler', (req, reply, done) => {
  req.user = 'Bob Dylan'
  done()
})
// And finally access it
fastify.get('/', (req, reply) => {
  reply.send(`Hello, ${req.user}!`)
})
```

Note that it is important to keep the initial shape of a decorated field as close as possible to the value intended to be set dynamically in the future. Initialize a decorator as a `''` if the intended value is a string, and as `null` if it will be an object or a function.

Remember this example works only with value types as reference types will be shared amongst all requests.
See [decorateRequest](#decorate-request).

See
[JavaScript engine fundamentals: Shapes and Inline Caches](https://mathiasbynens.be/notes/shapes-ics)
for more information on this topic.

### Usage
<a name="usage"></a>

#### `decorate(name, value, [dependencies])`
<a name="decorate"></a>

This method is used to customize the Fastify [server](Server.md) instance.

For example, to attach a new method to the server instance:

```js
fastify.decorate('utility', function () {
  // Something very useful
})
```

As mentioned above, non-function values can be attached:

```js
fastify.decorate('conf', {
  db: 'some.db',
  port: 3000
})
```

To access decorated properties, use the name provided to the
decoration API:

```js
fastify.utility()

console.log(fastify.conf.db)
```

The decorated [Fastify server](Server.md) is bound to `this` in route [route](Routes.md) handlers:

```js
fastify.decorate('db', new DbConnection())

fastify.get('/', async function (request, reply) {
  reply({hello: await this.db.query('world')})
})
```

The `dependencies` parameter is an optional list of decorators that the
decorator being defined relies upon. This list is simply a list of string names
of other decorators. In the following example, the "utility" decorator depends
upon "greet" and "log" decorators:

```js
fastify.decorate('utility', fn, ['greet', 'log'])
```

If a dependency is not satisfied, the `decorate` method will throw an exception.
The dependency check is performed before the server instance is booted. Thus,
it cannot occur during runtime.

#### `decorateReply(name, value, [dependencies])`
<a name="decorate-reply"></a>

As the name suggests, this API is used to add new methods/properties to the core
`Reply` object:

```js
fastify.decorateReply('utility', function () {
  // Something very useful
})
```

Note: using an arrow function will break the binding of `this` to the Fastify
`Reply` instance.

Note: using `decorateReply` will emit a warning if used with a reference type:

```js
// Don't do this
fastify.decorateReply('foo', { bar: 'fizz'})
```
In this example, the reference of the object is shared with all the requests: **any
mutation will impact all requests, potentially creating security vulnerabilities or memory leaks**. 
To achieve proper encapsulation across requests configure a new value for each incoming request
in the [`'onRequest'` hook](Hooks.md#onrequest). Example:

```js
const fp = require('fastify-plugin')

async function myPlugin (app) {
  app.decorateRequest('foo', null)
  app.addHook('onRequest', async (req, reply) => {
    req.foo = { bar: 42 }
  }) 
}

module.exports = fp(myPlugin)
```

See [`decorate`](#decorate) for information about the `dependencies` parameter.

#### `decorateRequest(name, value, [dependencies])`
<a name="decorate-request"></a>

As above with [`decorateReply`](#decorate-reply), this API is used add new
methods/properties to the core `Request` object:

```js
fastify.decorateRequest('utility', function () {
  // something very useful
})
```

Note: using an arrow function will break the binding of `this` to the Fastify
`Request` instance.

Note: using `decorateRequest` will emit a warning if used with a reference type:

```js
// Don't do this
fastify.decorateRequest('foo', { bar: 'fizz'})
```
In this example, the reference of the object is shared with all the requests: **any
mutation will impact all requests, potentially creating security vulnerabilities or memory leaks**.

To achieve proper encapsulation across requests configure a new value for each incoming request
in the [`'onRequest'` hook](Hooks.md#onrequest). Example:

```js
const fp = require('fastify-plugin')

async function myPlugin (app) {
  app.decorateRequest('foo', null)
  app.addHook('onRequest', async (req, reply) => {
    req.foo = { bar: 42 }
  }) 
}

module.exports = fp(myPlugin)
```

See [`decorate`](#decorate) for information about the `dependencies` parameter.

#### `hasDecorator(name)`
<a name="has-decorator"></a>

Used to check for the existence of a server instance decoration:

```js
fastify.hasDecorator('utility')
```

#### hasRequestDecorator
<a name="has-request-decorator"></a>

Used to check for the existence of a Request decoration:

```js
fastify.hasRequestDecorator('utility')
```

#### hasReplyDecorator
<a name="has-reply-decorator"></a>

Used to check for the existence of a Reply decoration:

```js
fastify.hasReplyDecorator('utility')
```

### Decorators and Encapsulation
<a name="decorators-encapsulation"></a>

Defining a decorator (using `decorate`, `decorateRequest`, or `decorateReply`)
with the same name more than once in the same **encapsulated** context will
throw an exception.

As an example, the following will throw:

```js
const server = require('fastify')()

server.decorateReply('view', function (template, args) {
  // Amazing view rendering engine
})

server.get('/', (req, reply) => {
  reply.view('/index.html', { hello: 'world' })
})

// Somewhere else in our codebase, we define another
// view decorator. This throws.
server.decorateReply('view', function (template, args) {
  // Another rendering engine
})

server.listen(3000)
```


But this will not:

```js
const server = require('fastify')()

server.decorateReply('view', function (template, args) {
  // Amazing view rendering engine.
})

server.register(async function (server, opts) {
  // We add a view decorator to the current encapsulated
  // plugin. This will not throw as outside of this encapsulated
  // plugin view is the old one, while inside it is the new one.
  server.decorateReply('view', function (template, args) {
    // Another rendering engine
  })

  server.get('/', (req, reply) => {
    reply.view('/index.page', { hello: 'world' })
  })
}, { prefix: '/bar' })

server.listen(3000)
```

### Getters and Setters
<a name="getters-setters"></a>

Decorators accept special "getter/setter" objects. These objects have functions
named `getter` and `setter` (though the `setter` function is optional). This
allows defining properties via decorators, for example:

```js
fastify.decorate('foo', {
  getter () {
    return 'a getter'
  }
})
```

Will define the `foo` property on the Fastify instance:

```js
console.log(fastify.foo) // 'a getter'
```
