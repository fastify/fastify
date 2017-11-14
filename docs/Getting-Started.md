<h1 align="center">Fastify</h1>

## Getting Started
Hello! Thank you for checking out Fastify!  
This document aims to be a gentle introduction to the framework and its features. It is an elementary introduction with examples and links to other parts of the documentation.  
Let's start!

<a name="install"></a>
### Install
```
npm i fastify --save
```
<a name="first-server"></a>
### Your first server
Let's write our first server:
```js
// Require the framework and instantiate it
const fastify = require('fastify')()

// Declare a route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

// Run the server!
fastify.listen(3000, function (err) {
  if (err) throw err
  fastify.log.info(`server listening on ${fastify.server.address().port}`)
})
```

Do you prefer to use `async/await`? Fastify supports it out-of-the-box.  
*(we also suggest using [make-promises-safe](https://github.com/mcollina/make-promises-safe) to avoid file descriptor and memory leaks)*
```js
const fastify = require('fastify')()

fastify.get('/', async (request, reply) => {
  return { hello: 'world' }
})

fastify.listen(3000, function (err) {
  if (err) throw err
  fastify.log.info(`server listening on ${fastify.server.address().port}`)
})
```

Awesome, that was easy.  
Unfortunately, writing a complex application requires significantly more code than this example. A classic problem when you are building a new application is how handle multiple files, asynchronous bootstrapping and the architecture of your code.  
Fastify offers an easy platform that helps solve all of problems, and more.

<a name="first-plugin"></a>
### Your first plugin
As with JavaScript everything is an object, with Fastify everything is a plugin.  
Before digging into it, let's see how it works!  
Let's declare our basic server, but instead of declaring the route inside the entry point, we'll declare it in an external file (checkout the [route declaration](https://github.com/fastify/fastify/blob/master/docs/Routes.md) docs).
```js
const fastify = require('fastify')()

fastify.register(require('./our-first-route'))

fastify.listen(3000, function (err) {
  if (err) throw err
  fastify.log.info(`server listening on ${fastify.server.address().port}`)
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
In this example we used the `register` API. This API is the core of the Fastify framework, and is the only way to register routes, plugins and so on.

At the beginning of this guide we noted that Fastify provides a foundation that assists with the asynchronous bootstrapping of your an application. Why this is important?
Consider the scenario where a database connection is needed to handle data storage. Obviously the database connection needs to be available prior to the server accepting connections. How do we address this problem?  
A typical solution is to use a complex callback, or promises, system that will mix the framework API with other libraries and the application code.  
Fastify handles this internally, with minimum effort!

Let's rewrite the above example with a database connection.  
*(we will use a simple example, for a robust solution consider using [`fastify-mongo`](https://github.com/fastify/fastify-mongodb) or another in the Fastify [ecosystem](https://github.com/fastify/fastify/blob/master/docs/Ecosystem.md))*
```js
const fastify = require('fastify')()

fastify.register(require('./our-db-connector'), {
  url: 'mongodb://mongo/db'
})
fastify.register(require('./our-first-route'))

fastify.listen(3000, function (err) {
  if (err) throw err
  fastify.log.info(`server listening on ${fastify.server.address().port}`)
})
```

```js
// our-db-connector.js
const MongoClient = require('mongodb').MongoClient

async function db (fastify, options) {
  const url = options.url
  delete options.url

  const db = await MongoClient.connect(url, options)
  fastify.decorate('mongo', db)
}

module.exports = db
```

```js
// our-first-route.js

async function routes (fastify, options) {
  const collection = fastify.mongo.collection('test')

  fastify.get('/', async (request, reply) => {
    return { hello: 'world' }
  })

  fastify.get('/search/:id', async (request, reply) => {
    return await collection.findOne({ id: request.params.id })
  })
}

module.exports = routes
```

Wow, that was fast!  
Let's recap what we have done here since we've introduced some new concepts.  
As you can see, we used `register` both for the database connector and the routes registration.
This is one of the best features of Fastify, it will load your plugins in the same order you declare them, and it will load the next plugin only once the current one has been loaded. In this way we can register the database connector in the first plugin and use it in the second.

We have used the `decorate` api API. Let's take a moment to understand what it is and how it works. A scenario is to use the same code/library in different parts of an application. A solution is to require the code/library that it is needed. it This works, but is annoying because of duplicated code repeated and, if needed, long refactors.  
To solve this Fastify offers the `decorate` API, which adds custom objects to the Fastify namespace, so that they can be used everywhere.

To dig deeper into how Fastify plugins work, how to develop new plugins, and for details on how to use the whole Fastify API to deal with the complexity of asynchronously bootstrapping an application, read [the hitchhiker's guide to plugins](https://github.com/fastify/fastify/blob/master/docs/Plugins-Guide.md).

<a name="validate-data"></a>
### Validate your data
Data validation is extremely important and is a core concept of the framework.  
To validate incoming requests, Fastify uses [JSON Schema](http://json-schema.org/).
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
This example shows how to pass an options object to the route, which accepts a `schema` key, that contains all of the schemas for route, `body`, `querystring`, `params` and `headers`.  
Read [Validation and Serialization](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md) to learn more.

<a name="serialize-data"></a>
### Serialize your data
Fastify has first class support for JSON. It is extremely optimized to parse a JSON body and to serialize JSON output.  
To speed up JSON serialization (yes, it is slow!) use the `response` key of the schema option like so:
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
Simply by specifying a schema as shown, a speed up your of serialization by 2x or even 3x can be achieved. This also helps protect against leaking of sensitive data, since Fastify will serialize only the data present in the response schema.
Read [Validation and Serialization](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md) to learn more.

<a name="extend-server"></a>
### Extend your server
Fastify is built to be extremely extensible and very minimal, We believe that a bare minimum framework is all that is necessary to make great applications possible.  
In other words, Fastify is not a "batteries included" framework, and relies on an amazing [ecosystem](https://github.com/fastify/fastify/blob/master/docs/Ecosystem.md)!

<a name="test-server"></a>
### Test your server
Fastify does not offer a testing framework, but we do recommend a way to write your tests that uses the features and the architecture of Fastify.  
Read the [testing](https://github.com/fastify/fastify/blob/master/docs/Testing.md) documentation to learn more!

<a name="cli"></a>
### Run your server from CLI
Fastify also has CLI integration thanks to [fastify-cli](https://github.com/fastify/fastify-cli). It's very easy!  
Simply add the following lines to `package.json`:
```json
{
  "scripts": {
    "start": "fastify server.js"
  }
}
```

And create your server file(s):
```js
// server.js
'use strict'

module.exports = async function (fastify, opts) {
  fastify.get('/', async (req, reply) => {
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
