<h1 align="center">Fastify</h1>

## Testing

Testing is one of the most important parts of developing an application. Fastify is very flexible when it comes to testing and is compatible with most testing frameworks (such as [Tap](https://www.npmjs.com/package/tap), which is used in the examples below).

Let's `cd` into a fresh directory called 'testing-example' and type `npm init -y` in our terminal.

run `npm install fastify && npm install tap pino-pretty --save-dev`

### Separating concerns makes testing easy

 First we're going to separate our application code from our server code:

**app.js**:

```js
'use strict'

const fastify = require('fastify')

function build(opts={}) {
  const app = fastify(opts)
  app.get('/', async function (request, reply) {
    return { hello: 'world' }
  })

  return app
}

module.exports = build
```

**server.js**:

```js
'use strict'

const server = require('./app')({
  logger: {
    level: 'info',
    prettyPrint: true
  }
})

server.listen(3000, (err, address) => {
  if (err) {
    console.log(err)
    process.exit(1)
  }
})
```

### Benefits of using fastify.inject()

Fastify comes with built-in support for fake http injection thanks to [`light-my-request`](https://github.com/fastify/light-my-request).

Before introducing any tests, we'll use the `.inject` method to make a fake request to our route:

**app.test.js**:

```js
'use strict'

const build = require('./app')

const test = async () => {
  const app = build()

  const response = await app.inject({
    method: 'GET',
    url: '/'
  })

  console.log('status code: ', response.statusCode)
  console.log('body: ', response.body)
}
test()
```

First, our code will run inside an asynchronous function, giving us access to async/await. 

`.inject` insures all registered plugins have booted up and our application is ready to test. Lastly we pass the request method we want to use and a route. Using await we can store the response without a callback.



Run the test file in your terminal `node app.test.js`

```sh
status code:  200
body:  {"hello":"world"}
```



### Testing with http injection

Now we can replace our `console.log` calls with actual tests!

In your `package.json` change the "test" script to:

`"test": "tap --reporter=list --watch"`

**app.test.js**:

```js
'use strict'

const { test } = require('tap')
const build = require('./app')

test('requests the "/" route', async t => {
  const app = build()

  const response = await app.inject({
    method: 'GET',
    url: '/'
  })
  t.strictEqual(response.statusCode, 200, 'returns a status code of 200')
})
```

Finally run `npm test` in the terminal and see your test results!

The `inject` method can do much more than a simple GET request to a URL:
```js
fastify.inject({
  method: String,
  url: String,
  query: Object,
  payload: Object,
  headers: Object,
  cookies: Object
}, (error, response) => {
  // your tests
})
```

`.inject` methods can also be chained by omitting the callback function:

```js
fastify
  .inject()
  .get('/')
  .headers({ foo: 'bar' })
  .query({ foo: 'bar' })
  .end((err, res) => { // the .end call will trigger the request
    console.log(res.payload)
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
    headers: Object,
    cookies: Object
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

#### Another Example:

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
    t.deepEqual(response.json(), { hello: 'world' })
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
