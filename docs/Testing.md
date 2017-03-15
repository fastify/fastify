<h1 align="center">Fastify</h1>

## Testing
Testing is one of the most important part when you are developing an application.  
Fastify does not offer a testing framework out of the box, but we can recommend you an handy and nice way to build your unit testing environment.

The modules you'll need:
- [Tap](https://www.npmjs.com/package/tap): an excellent testing framework, it will give you out of the box a very good assertion library and a lot utilities.  
- [Request](https://www.npmjs.com/package/request): a complete library to perform request of any kind.
- [Minimist](https://www.npmjs.com/package/minimist): a CLI parser, that you will use to run server from the command line.


```js
// server.js
const minimist = require('minimist')
const fastify = require('fastify')()

const schema = {
  out: {
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  }
}

function start (opts, callback) {
  fastify.get('/', schema, function (request, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.listen(opts.port, function (err) {
    callback(err, fastify)
  })
}

// In this way you can run the server both from the CLI and as a required module.
if (require.main === module) {
  // Run the server with:
  // $ node server.js -p 8080
  start(minimist(process.argv.slice(2), {
    integer: ['port'],
    alias: {
      port: 'p'
    },
    default: {
      port: 3000
    }
  }), (err, instance) => {
    if (err) throw err

    console.log(`server listening on ${instance.server.address().port}`)
  })
}

// Here we are exposing the function that starts the server
// in this way inside the test files we can require and run it.
module.exports = { start }
```

```js
// test.js
const t = require('tap')
const test = t.test
const request = require('request')
const server = require('./server')

// Run the server
server.start({ port: 0 }, (err, fastify) => {
  t.error(err)
  // Will allow the program to exit if this is
  // the only active server in the event system.
  fastify.server.unref()

  test('The server should start', t => {
    t.plan(4)
    // Perform the request
    request({
      method: 'GET',
      uri: `http://localhost:${fastify.server.address().port}`
    }, (err, response, body) => {
      // Unit test
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})
```
