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
  query: Object,
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
    query: Object,
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
const Fastify = require('fastify')

function buildFastify () {
  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.send({ hello: 'world' })
  })
  
  return fastify
}

module.exports = buildFastify
```

**test.js**
```js
const tap = require('tap')
const buildFastify = require('./app')

tap.test('GET `/` route', t => {
  t.plan(4)
  
  const fastify = buildFastify()
  
  // At the end of your tests it is highly recommended to call `.close()`
  // to ensure that all connections to external services get closed.
  t.tearDown(() => fastify.close())

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, response) => {
    t.error(err)
    t.strictEqual(response.statusCode, 200)
    t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(response.payload), { hello: 'world' })
  })
})
```

### Testing with a running server
Fastify can also be tested after starting the server with `fastify.listen()` or after initializing routes and plugins with `fastify.ready()`.

#### Example:

Uses **app.js** from the previous example.

**test-listen.js** (testing with [`Request`](https://www.npmjs.com/package/request))
```js
const tap = require('tap')
const request = require('request')
const buildFastify = require('./app')

tap.test('GET `/` route', t => {
  t.plan(5)
  
  const fastify = buildFastify()
  
  t.tearDown(() => fastify.close())
  
  fastify.listen(0, (err) => {
    t.error(err)
    
    request({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})
```

**test-ready.js** (testing with [`SuperTest`](https://www.npmjs.com/package/supertest))
```js
const tap = require('tap')
const supertest = require('supertest')
const buildFastify = require('./app')

tap.test('GET `/` route', async (t) => {
  const fastify = buildFastify()

  t.tearDown(() => fastify.close())
  
  await fastify.ready()
  
  const response = await supertest(fastify.server)
    .get('/')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
  t.deepEqual(response.body, { hello: 'world' })
})
```

### How to inspect tap tests
1. Isolate your test by passing the `{only: true}` option
```javascript
test('should ...', {only: true}, t => ...)
```
2. Run `tap` using `npx`
```bash
> npx tap -O -T --node-arg=--inspect-brk test/<test-file.test.js>
```
- `-O` specifies to run tests with the `only` option enabled
- `-T` specifies not to timeout (while you're debugging)
- `--node-arg=--inspect-brk` will launch the node debugger
3. In VS Code, create and launch a `Node.js: Attach` debug configuration. No modification should be necessary.

Now you should be able to step through your test file (and the rest of `fastify`) in your code editor.
