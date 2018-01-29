<h1 align="center">Fastify</h1>

## Testing
Testing is one of the most important parts of developing an application. Fastify is very flexible when it comes to testing and is compatible with most testing frameworks (such as [Tap](https://www.npmjs.com/package/tap), which is used in the examples below).

<a name="inject"></a>
### Testing with http injection
Fastify comes with built-in support for fake http injection thanks to [`light-my-request`](https://github.com/fastify/light-my-request).

To inject a fake http request, use the `inject` method:
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

#### Example:

**app.js**
```js
const fastify = require('fastify')()

fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

module.exports = fastify
```

**test.js**
```js
const tap = require('tap')
const fastify = require('./app')

tap.test('GET `/` route', t => {
  t.plan(4)

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json')
    t.deepEqual(JSON.parse(response.payload), { hello: 'world' })
  })
})

// Even if the server is not running (inject does not run the server),
// at the end of your tests it is highly recommended to call `.close()`
// to ensure that all connections to external services get closed.
tap.tearDown(() => fastify.close())
```

### Testing with a running server
Fastify can also be tested after starting the server with `fastify.listen()` or after initializing routes and plugins with `fastify.ready()`.

#### Example:

**app.js**
```js
const fastify = require('fastify')()

fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

module.exports = fastify
```

**test-listen.js** (testing with [`Request`](https://www.npmjs.com/package/request))
```js
const tap = require('tap')
const request = require('request')
const fastify = require('./app')

fastify.listen(0, (err) => {
  tap.error(err)
  
  tap.test('GET `/` route', t => {
    t.plan(4)

    request({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-type'], 'application/json')
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
  
  tap.tearDown(() => fastify.close())
})
```

**test-ready.js** (testing with [`SuperTest`](https://www.npmjs.com/package/supertest))
```js
const tap = require('tap')
const supertest = require('supertest')
const fastify = require('./app')

tap.test('setup', () => fastify.ready())

tap.test('GET `/` route', t => {
  t.plan(2)
  
  supertest(fastify.server)
    .get('/')
    .expect(200)
    .expect('Content-Type', 'application/json')
    .end((err, response) => {
      t.error(err)
      t.deepEqual(response.body, { hello: 'world' })
    })
})

tap.tearDown(() => fastify.close())
```
