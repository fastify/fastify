<h1 align="center">Fastify</h1>

## Testing
Testing is one of the most important part when you are developing an application.
Fastify does not offer a testing framework out of the box, but we can recommend you an handy and nice way to build your unit testing environment.

### Approach #1 - Jest + Supertest

Modules you'll need:
- [Jest](https://github.com/facebook/jest): Facebook's awesome JavaScript testing solution. It has a lot of great features including own assertions, easy mocks, custom environments and many, many more.
- [Supertest](https://github.com/visionmedia/supertest): HTTP assertions library. Just pass a node `http.Server` to it and use the magic.

First we need to create a [custom Jest test environment](https://facebook.github.io/jest/docs/en/configuration.html#testenvironment-string):

```js
const NodeEnvironment = require('jest-environment-node');
const fastify = require('path/to/your/server');

// We need to extend our custom environment class from the
// NodeEnvironment jest class - otherwise it won't work.
class IntegrationEnvironment extends NodeEnvironment {
    // This function loads up before any tests will run
    async setup() {
        // Here you can register any additional fastify plugins you want
        // i.e. an in-memory mongo database:
        // fastify.register(require('fastify-mongo-memory'));

        // Wait until all fastify plugins have been loaded
        await fastify.ready();

        // Variables under this.global will be available in all test suites
        // in the `global` variable. fastify.server is the Node HTTP Server
        // which we will later need to pass to supertest
        this.global.server = fastify.server;

        // And in case for using the in-memory mongo plugin:
        // this.global.db = fastify.mongo.db
    }

    // This function runs after all test suites complete
    async teardown() {
        fastify.close();
    }
}

module.exports = IntegrationEnvironment;
```

In order to be able to run the server manually and import fastify instance as above, we need to configure our main fastify server file:

```js
const fastify = require('fastify')();

fastify.get('/hello', async (req, reply) => {
    reply.send({ hello: 'world' });
});

// This simple approach gives us the option to import
// a fully configured fastify instance without running it.
// We want to run the server manually after our
// test environment gets ready.
if (module.parent) {
    module.exports = fastify;
} else {
    fastify.listen(8080, error => {
        if (error) {
            console.log(error);
            throw error;
        }
        console.log('Listening on port 8080');
    });
}
```

And that's all! We can now start writing our tests which will be very clean and pleasant create. Check out this example:

```js
// Notice the `global.server` variable here. To make supertest
// fully working you need to pass a Node HTTP Server to it.
// Thanks to Jest test environments this is clean and easy!
const request = require('supertest')(global.server);

describe('hello world route', () => {
    test('should return hello world', () => {
        return request
          .get('/hello')
          .expect(200, {
            hello: 'world'
          });
    });
});
```

What's cool in this approach is that you can in an easy and clean way use your main fastify instance (fully configured), and add some additional configuration to it by creating your own test environment without having to interfere into your main server implementation.

Of course, you don't have to limit yourself with one test environment - you can have plenty of them for different purposes!

### Approach #2 - Tap + Request + Minimist

Modules you'll need:
- [Tap](https://www.npmjs.com/package/tap): an excellent testing framework, it will give you out of the box a very good assertion library and a lot utilities.
- [Request](https://www.npmjs.com/package/request): a complete library to perform request of any kind.
- [Minimist](https://www.npmjs.com/package/minimist): a CLI parser, that you will use to run server from the command line.


```js
// server.js
const minimist = require('minimist')
const Fastify = require('fastify')

const options = {
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

function start (opts, callback) {
  const fastify = Fastify()

  fastify.get('/', options, function (request, reply) {
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
      fastify.close()
    })
  })
})
```

<a name="inject"></a>
### Testing with http injection
Fastify supports fake http injection thanks to [light-my-request](https://github.com/fastify/light-my-request).

You just need to use the api `inject`:
```js
fastify.inject({
  method: String,
  url: String,
  payload: Object,
  headers: Object
}, (error, response) => {
  // your tests
})
```

or in the promisified version

```js
fastify
  .inject({
    method: String,
    url: String,
    payload: Object,
    headers: Object
  })
  .then(response => {
    // your tests
  })
  .catch(err => {
    // handle error
  })
```

Async await is supported as well!
```js
try {
  const res = await fastify.inject({ method: String, url: String, payload: Object, headers: Object })
  // your tests
} catch (err) {
  // handle error
}
```
Example:
```js
// server.js
const minimist = require('minimist')
const fastify = require('fastify')()

const options = {
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

fastify.get('/', options, function (request, reply) {
  reply.send({ hello: 'world' })
})

function start (opts, callback) {
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

// note that now we are also exposing the fastify instance
module.exports = { start, fastify }
```

```js
// test.js
const t = require('tap')
const test = t.test
const fastify = require('./server').fastify

test('GET `/` route', t => {
  t.plan(3)

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], '' + res.payload.length)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
    // even if the server is not running (inject does not run the server)
    // at the end of your tests is highly recommended call `.close()`,
    // in this way you will close all the connections to external services
    fastify.close()
  })
})
```
