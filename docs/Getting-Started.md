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

<a name="schema"></a>
### Schema serialization
How get better performances?  
Fastify is designed to be very performant, if you want to make it even faster, you can use JSON schema to speed up the serialization of your output.
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
*If you want to know more about the serialization and validation, check [here](https://github.com/fastify/fastify/blob/master/docs/Validation-And-Serialize.md)!*

<a name="register"></a>
### Register
As you can see use Fastify is very easy and handy.
Obviously register all the routes in the same file is not a good idea, Fastify offers an utility to solve this problem, `register`.

```js
/* server.js */

const fastify = require('fastify')()

fastify.register(require('./route'), function (err) {
  if (err) throw err
})

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
  fastify.get('/', schema, function (req, reply) {
    reply.send({ hello: 'world' })
  })
  next()
}
```

<a name="cli"></a>
### Run from CLI
You can also run Fastify from the CLI thanks to [fastify-cli](https://github.com/fastify/fastify-cli), it's very easy!  
Just add the following lines to your `package.json`
```JSON
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
<a name="next"></a>
### Next
Do you want to know more?
Check the documentation folder [here](https://github.com/fastify/fastify/blob/master/docs/)!
