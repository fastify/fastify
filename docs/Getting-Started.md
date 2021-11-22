<h1 align="center">Fastify</h1>

## Getting Started
Hello! Thank you for checking out Fastify!<br>
This document aims to be a gentle introduction to the framework and its features. It is an elementary preface with examples and links to other parts of the documentation.<br>
Let's start!

<a name="install"></a>
### Install
Install with npm:
```
npm i fastify --save
```
Install with yarn:
```
yarn add fastify
```

<a name="first-server"></a>
### Your first server
Let's write our first server:
```js
// Require the framework and instantiate it

// ESM
import Fastify from 'fastify'
const fastify = Fastify({
  logger: true
})
// CommonJs
const fastify = require('fastify')({
  logger: true
})

// Declare a route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

// Run the server!
fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})
```

Do you prefer to use `async/await`? Fastify supports it out-of-the-box.<br>
*(We also suggest using [make-promises-safe](https://github.com/mcollina/make-promises-safe) to avoid file descriptor and memory leaks.)*
```js
// ESM
import Fastify from 'fastify'
const fastify = Fastify({
  logger: true
})
// CommonJs
const fastify = require('fastify')({
  logger: true
})

fastify.get('/', async (request, reply) => {
  return { hello: 'world' }
})

const start = async () => {
  try {
    await fastify.listen(3000)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
```

Awesome, that was easy.<br>
Unfortunately, writing a complex application requires significantly more code than this example. A classic problem when you are building a new application is how to handle multiple files, asynchronous bootstrapping, and the architecture of your code.<br>
Fastify offers an easy platform that helps to solve all of the problems outlined above, and more!

> ## Note
> The above examples, and subsequent examples in this document, default to listening *only* on the localhost `127.0.0.1` interface. To listen on all available IPv4 interfaces the example should be modified to listen on `0.0.0.0` like so:
>
> ```js
> fastify.listen(3000, '0.0.0.0', function (err, address) {
>   if (err) {
>     fastify.log.error(err)
>     process.exit(1)
>   }
>   fastify.log.info(`server listening on ${address}`)
> })
> ```
>
> Similarly, specify `::1` to accept only local connections via IPv6. Or specify `::` to accept connections on all IPv6 addresses, and, if the operating system supports it, also on all IPv4 addresses.
>
> When deploying to a Docker (or another type of) container using `0.0.0.0` or `::` would be the easiest method for exposing the application.

<a name="first-plugin"></a>
### Your first plugin
As with JavaScript, where everything is an object, with Fastify everything is a plugin.<br>
Before digging into it, let's see how it works!<br>
Let's declare our basic server, but instead of declaring the route inside the entry point, we'll declare it in an external file (check out the [route declaration](Routes.md) docs).
```js
// ESM
import Fastify from 'fastify'
import firstRoute from './our-first-route'
const fastify = Fastify({
  logger: true
})

fastify.register(firstRoute)

fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})
```

```js
// CommonJs
const fastify = require('fastify')({
  logger: true
})

fastify.register(require('./our-first-route'))

fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})
```

```js
// our-first-route.js

async function routes (fastify, options) {
  fastify.get('/', async (request, reply) => {
    return { hello: 'world' }
  })
}

module.exports = routes
```
In this example, we used the `register` API, which is the core of the Fastify framework. It is the only way to add routes, plugins, et cetera.

At the beginning of this guide, we noted that Fastify provides a foundation that assists with asynchronous bootstrapping of your application. Why is this important?
Consider the scenario where a database connection is needed to handle data storage. The database connection needs to be available before the server is accepting connections. How do we address this problem?<br>
A typical solution is to use a complex callback, or promises - a system that will mix the framework API with other libraries and the application code.<br>
Fastify handles this internally, with minimum effort!

Let's rewrite the above example with a database connection.<br>

First, install `fastify-plugin` and `fastify-mongodb`:

```
npm i --save fastify-plugin fastify-mongodb
```

**server.js**
```js
// ESM
import Fastify from 'fastify'
import dbConnector from './our-db-connector'
import firstRoute from './our-first-route'

const fastify = Fastify({
  logger: true
})
fastify.register(dbConnector)
fastify.register(firstRoute)

fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})
```

```js
// CommonJs
const fastify = require('fastify')({
  logger: true
})

fastify.register(require('./our-db-connector'))
fastify.register(require('./our-first-route'))

fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})

```

**our-db-connector.js**
```js
// ESM
import fastifyPlugin from 'fastify-plugin'
import fastifyMongo from 'fastify-mongodb'

async function dbConnector (fastify, options) {
  fastify.register(fastifyMongo, {
    url: 'mongodb://localhost:27017/test_database'
  })
}

// Wrapping a plugin function with fastify-plugin exposes the decorators	
// and hooks, declared inside the plugin to the parent scope.
module.exports = fastifyPlugin(dbConnector)

```

```js
// CommonJs
const fastifyPlugin = require('fastify-plugin')

async function dbConnector (fastify, options) {
  fastify.register(require('fastify-mongodb'), {
    url: 'mongodb://localhost:27017/test_database'
  })
}

// Wrapping a plugin function with fastify-plugin exposes the decorators	
// and hooks, declared inside the plugin to the parent scope.
module.exports = fastifyPlugin(dbConnector)

```

**our-first-route.js**
```js
async function routes (fastify, options) {
  const collection = fastify.mongo.db.collection('test_collection')

  fastify.get('/', async (request, reply) => {
    return { hello: 'world' }
  })

  fastify.get('/animals', async (request, reply) => {
    const result = await collection.find().toArray()
    if (result.length === 0) {
      throw new Error('No documents found')
    }
    return result
  })

  fastify.get('/animals/:animal', async (request, reply) => {
    const result = await collection.findOne({ animal: request.params.animal })
    if (!result) {
      throw new Error('Invalid value')
    }
    return result
  })

  const animalBodyJsonSchema = {
    type: 'object',
    required: ['animal'],
    properties: {
      animal: { type: 'string' },
    },
  }

  const schema = {
    body: animalBodyJsonSchema,
  }

  fastify.post('/animals', { schema }, async (request, reply) => {
    // we can use the `request.body` object to get the data sent by the client
    const result = await collection.insertOne({ animal: request.body.animal })
    return result
  })
}

module.exports = routes
```

Wow, that was fast!<br>
Let's recap what we have done here since we've introduced some new concepts.<br>
As you can see, we used `register` for both the database connector and the registration of the routes.
This is one of the best features of Fastify, it will load your plugins in the same order you declare them, and it will load the next plugin only once the current one has been loaded. In this way, we can register the database connector in the first plugin and use it in the second *(read [here](Plugins.md#handle-the-scope) to understand how to handle the scope of a plugin)*.
Plugin loading starts when you call `fastify.listen()`, `fastify.inject()` or `fastify.ready()`

The MongoDB plugin uses the `decorate` API to add custom objects to the Fastify instance, making them available for use everywhere. Use of this API is encouraged to facilitate easy code reuse and to decrease code or logic duplication.

To dig deeper into how Fastify plugins work, how to develop new plugins, and for details on how to use the whole Fastify API to deal with the complexity of asynchronously bootstrapping an application, read [the hitchhiker's guide to plugins](Plugins-Guide.md).

<a name="plugin-loading-order"></a>
### Loading order of your plugins
To guarantee consistent and predictable behavior of your application, we highly recommend to always load your code as shown below:
```
└── plugins (from the Fastify ecosystem)
└── your plugins (your custom plugins)
└── decorators
└── hooks
└── your services
```
In this way, you will always have access to all of the properties declared in the current scope.<br/>
As discussed previously, Fastify offers a solid encapsulation model, to help you build your application as single and independent services. If you want to register a plugin only for a subset of routes, you just have to replicate the above structure.
```
└── plugins (from the Fastify ecosystem)
└── your plugins (your custom plugins)
└── decorators
└── hooks
└── your services
    │
    └──  service A
    │     └── plugins (from the Fastify ecosystem)
    │     └── your plugins (your custom plugins)
    │     └── decorators
    │     └── hooks
    │     └── your services
    │
    └──  service B
          └── plugins (from the Fastify ecosystem)
          └── your plugins (your custom plugins)
          └── decorators
          └── hooks
          └── your services
```

<a name="validate-data"></a>
### Validate your data
Data validation is extremely important and a core concept of the framework.<br>
To validate incoming requests, Fastify uses [JSON Schema](https://json-schema.org/).
(JTD schemas are loosely supported, but `jsonShorthand` must be disabled first)

Let's look at an example demonstrating validation for routes:
```js
const opts = {
  schema: {
    body: {
      type: 'object',
      properties: {
        someKey: { type: 'string' },
        someOtherKey: { type: 'number' }
      }
    }
  }
}

fastify.post('/', opts, async (request, reply) => {
  return { hello: 'world' }
})
```
This example shows how to pass an options object to the route, which accepts a `schema` key that contains all of the schemas for route, `body`, `querystring`, `params`, and `headers`.<br>
Read [Validation and Serialization](Validation-and-Serialization.md) to learn more.

<a name="serialize-data"></a>
### Serialize your data
Fastify has first class support for JSON. It is extremely optimized to parse JSON bodies and to serialize JSON output.<br>
To speed up JSON serialization (yes, it is slow!) use the `response` key of the schema option as shown in the following example:
```js
const opts = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
}

fastify.get('/', opts, async (request, reply) => {
  return { hello: 'world' }
})
```
By specifying a schema as shown, you can speed up serialization by a factor of 2-3. This also helps to protect against leakage of potentially sensitive data, since Fastify will serialize only the data present in the response schema.
Read [Validation and Serialization](Validation-and-Serialization.md) to learn more.

<a name="request-payload"></a>
### Parsing request payloads
Fastify parses `'application/json'` and `'text/plain'` request payloads natively, with the result accessible from the [Fastify request](Request.md) object at `request.body`.<br>
The following example returns the parsed body of a request back to the client:

```js
const opts = {}
fastify.post('/', opts, async (request, reply) => {
  return request.body
})
```

Read [Content Type Parser](ContentTypeParser.md) to learn more about Fastify's default parsing functionality and how to support other content types.

<a name="extend-server"></a>
### Extend your server
Fastify is built to be extremely extensible and minimal, we believe that a bare-bones framework is all that is necessary to make great applications possible.<br>
In other words, Fastify is not a "batteries included" framework, and relies on an amazing [ecosystem](Ecosystem.md)!

<a name="test-server"></a>
### Test your server
Fastify does not offer a testing framework, but we do recommend a way to write your tests that uses the features and architecture of Fastify.<br>
Read the [testing](Testing.md) documentation to learn more!

<a name="cli"></a>
### Run your server from CLI
Fastify also has CLI integration thanks to [fastify-cli](https://github.com/fastify/fastify-cli).

First, install `fastify-cli`:

```
npm i fastify-cli
```

You can also install it globally with `-g`.

Then, add the following lines to `package.json`:
```json
{
  "scripts": {
    "start": "fastify start server.js"
  }
}
```

And create your server file(s):
```js
// server.js
'use strict'

module.exports = async function (fastify, opts) {
  fastify.get('/', async (request, reply) => {
    return { hello: 'world' }
  })
}
```

Then run your server with:
```bash
npm start
```

<a name="slides"></a>
### Slides and Videos
- Slides
  - [Take your HTTP server to ludicrous speed](https://mcollina.github.io/take-your-http-server-to-ludicrous-speed) by [@mcollina](https://github.com/mcollina)
  - [What if I told you that HTTP can be fast](https://delvedor.github.io/What-if-I-told-you-that-HTTP-can-be-fast) by [@delvedor](https://github.com/delvedor)

- Videos
  - [Take your HTTP server to ludicrous speed](https://www.youtube.com/watch?v=5z46jJZNe8k) by [@mcollina](https://github.com/mcollina)
  - [What if I told you that HTTP can be fast](https://www.webexpo.net/prague2017/talk/what-if-i-told-you-that-http-can-be-fast/) by [@delvedor](https://github.com/delvedor)
