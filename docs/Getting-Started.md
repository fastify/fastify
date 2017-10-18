<h1 align="center">Fastify</h1>

## Getting Started

### Install
```
npm i fastify --save
```
### Your first server
Let's write a *Hello world* server!
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
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

Do you prefer to use `async/await`? Please review [Routes#async-await](https://github.com/fastify/fastify/blob/master/docs/Routes.md#async-await)!

<a name="schema"></a>
### Schema serialization
Fastify is designed for performance. To truly turbocharge our server, we can serialize responses according to the [JSON Schema](http://json-schema.org/) standard:
```js
const fastify = require('fastify')()

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

// Declare a route with an output schema
fastify.get('/', opts, function (request, reply) {
  reply.send({ hello: 'world' })
})

fastify.listen(3000, function (err) {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

*To learn more about using serialization and validation, see [Validation and Serialization](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md)!*

<a name="register"></a>
### Register
As you can see, using Fastify is very easy and handy. Obviously, registering all of your routes in the same file is not a good idea, so Fastify offers a utility to solve this problem, `register`:
```js
/* server.js */

const fastify = require('fastify')()

fastify.register(require('./route'))

const opts = {
  hello: 'world',
  something: true
}

fastify.register([
  require('./another-route'),
  require('./yet-another-route')
], opts, function (err) {
  if (err) throw err
})

fastify.listen(8000, function (err) {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

```js
/* route.js */

module.exports = function (fastify, options, next) {
  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  next()
}
```

or with `async/await`:
```js
/* route.js */

module.exports = async function (fastify, options) {
  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
}
```

<a name="cli"></a>
### Run from CLI
You can also run Fastify from the CLI thanks to [fastify-cli](https://github.com/fastify/fastify-cli). It's very easy! Simply add the following lines to your `package.json`:
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

module.exports = function (fastify, opts, next) {
  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })
  next()
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

<a name="next"></a>
### Next
Do you want to learn more? Check out the documentation folder located [here](https://github.com/fastify/fastify/blob/master/docs/)!
