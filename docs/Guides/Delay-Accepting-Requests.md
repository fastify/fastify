<h1 align="center">Fastify</h1>

# Delay Accepting Requests

## Introduction

Fastify provides several [hooks](../Reference/Hooks.md) useful for a variety of
situations. One of them is the [`onReady`](../Reference/Hooks.md#onready) hook, which is
useful for executing tasks *right before* the server starts accepting new
requests. There isn't, though, a direct mechanism to handle scenarios in which
you'd like the server to start accepting **specific** requests and denying all
others, at least up to some point.

Say, for instance, your server needs to authenticate with an OAuth provider in
order to start serving requests. To do that it'd need to engage in the
[OAuth Authorization Code Flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow),
which would require it to listen to two requests from the authentication
provider:

1. the Authorization Code webhook
2. the tokens webhook

Until the authorization flow is done you wouldn't be able to serve customer
requests. What to do then?

There are several solutions for achieving that kind of behavior. Here we'll
introduce one of such techniques and, hopefully, you'll be able to get things
rolling asap!

## Solution

### Overview

The proposed solution is one of many possible ways for dealing with the
proposed scenario and many similar to it. It relies solely on Fastify, so no
fancy infrastructure tricks or third-party libraries will be necessary.

In order to simplify things we won't be dealing with a precise OAuth flow but,
instead, simulate a scenario in which some key is needed in order to serve
a request and that key can only be retrieved in runtime by authenticating with
an external provider.

The main goal here is to deny requests that would otherwise fail **as early as
possible** and with some **meaningful context**. That's both useful for the
server (less resources allocated into a bound-to-fail task) and for the client
(they get some meaningful information and don't need to wait long for it).

That will be achieved by wrapping into a custom plugin two main features:

1. the mechanism for authenticating with the provider
[decorating](../Referece/Decorators.md) the `fastify` object with the
authentication key (`magicKey` from here onwards)
1. the mechanism for denying requests that would, otherwise, fail

### Hands-on

For this sample solution we'll be using the following tools on a Linux
environment running the `5.17.1-arch1-1` Kernel version:

- `node.js v16.14.2`
- `npm 8.5.0`
- `fastify 3.28.0`
- `fastify-plugin 3.0.1`
- `undici 5.0.0`

Say we have the following base server set up at first:

```js
const Fastify = require('fastify')

const provider = require('./provider')

const server = Fastify({ logger: true })
const USUAL_WAIT_TIME_MS = 5000

server.get('/ping', (request, reply) => {
  reply.send({ error: false, ready: request.server.magicKey !== null })
})

server.post('/webhook', (request, reply) => {
  // It's good practice to validate webhook requests really come from
  // whoever you expect. This is skipped in this sample for the sake
  // of simplicity

  const { magicKey } = JSON.parse(request.body)
  request.server.magicKey = magicKey
  request.log.info('Ready for customer requests!')

  reply.send({ error: false })
})

server.get('/v1*', async (request, reply) => {
  try {
    const data = await provider.fetchSensitiveData(request.server.magicKey)
   return { customer: true, error: false }
  } catch (error) {
    request.log.error({
      error,
      message: 'Failed at fetching sensitive data from provider',
    })
    
    reply.statusCode = 500
   return { customer: null, error: true }
  }
})

server.decorate('magicKey', null)

server.listen({ port: '1234' }, () => {
  provider.thirdPartyMagicKeyGenerator(USUAL_WAIT_TIME_MS)
    .catch((error) => {
      server.log.error({
        error,
        message: 'Got an error while trying to get the magic key!'
      })

      // Since we won't be able to serve requests, might as well wrap
      // things up
      server.close(() => process.exit(1))
    })
})
```

Our code is simply setting up a Fastify server with a few routes:

- we're setting a `/ping` route that specifies whether the service is ready or
not to serve requests by checking if the `magicKey` has been set up
- we're setting a `/webhook endpoint for our provider to reach back to us when
they're ready to share the `magicKey`. The `magicKey` is, then, saved into the
previously set decorator on the `fastify` object
- we're, finally, a catchall `/v1*` route to simulate what would have been
customer-initiated requests. These requests rely on us having a valid `magicKey`

The `provider.js` file, simulating actions of an external provider, is as
follows:

```js
const { fetch } = require('undici')

const MAGIC_KEY = '12345'

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms))

exports.thirdPartyMagicKeyGenerator = async (ms) => {
  // Simulate processing delay
  await delay(ms)

  // Simulate webhook request to our server
  const { status } = await fetch(
    'http://localhost:1234/webhook',
    {
      body: JSON.stringify({ magicKey: MAGIC_KEY }),
      method: 'POST',
    },
  )

  if (status !== 200) {
    throw new Error('Failed to fetch magic key')
  }
}

exports.fetchSensitiveData = async (key) => {
  // Simulate processing delay
  await delay(700)
  const data = { sensitive: true }
  
  if (key === MAGIC_KEY) {
    return data
  }
  
  throw new Error('Invalid key')
}
```

The most important snippet here is the `thirdPartyMagicKeyGenerator` function,
which will wait for 5 seconds and, then, make the POST request to our `/webhook`
endpoint.

When our server spins up we start listening to new connections without having
our `magicKey` set up. Until we receive the webhook request from our external
provider (in this example we're simulating a 5 second delay) all our requests
under the `/v1*` path (customer requests) will fail. Worse than that: they'll
fail after we've reached out to our provider with an invalid key and got an
error from them. That wasted time and resources, both from us and from our
customers. Depending on the kind of application we're running and on the request
rate we're expecting this delay is not acceptable or, at least, very annoying.

Of course, that could be simply mitigated by checking whether or not the
`magicKey` has been set up before hitting the provider in the `/v1*` handler.
Sure, but that would lead to bloat on the code. And imagine we have dozens of
different routes, with different controllers, that require that key. Should
we repeatedly add that check in all of them? That's error-prone and there are
more elegant solutions.

What we'll do to improve this setup overall is create a
[`Plugin`](../Reference/Plugins.md) that'll be solely responsible for making
sure we both:

- do not accept requests that would otherwise fail until we're ready for them
- make sure we reach out to our provider as soon as possible

This way we'll make sure all our setup regarding this specific _business rule_
is placed on a single entity, instead of scattered all across our code base.

With the changes to improve this behavior, the code will look like this:

##### index.js

```js
const fastify = require('fastify')

const provider = require('./provider')
const delayIncomingRequests = require('./delay-incoming-requests')

const server = new fastify({ logger: true })

server.register(delayIncomingRequests)

// Non-blocked URL
server.get('/ping', (request, reply) => {
  reply.send({ error: false, ready: request.server.magicKey !== null })
})

// Webhook to handle the provider's response - also non-blocked
server.post('/webhook', (request, reply) => {
  // It's good practice to validate webhook requests really come from
  // whoever you expect. This is skipped in this sample for the sake
  // of simplicity

  const { magicKey } = JSON.parse(request.body)
  request.server.magicKey = magicKey
  request.log.info('Ready for customer requests!')

  reply.send({ error: false })
})

// Blocked URLs
server.get('/v1*', async (request, reply) => {
  try {
    const data = await provider.fetchSensitiveData(request.server.magicKey)
   return { customer: true, error: false }
  } catch (error) {
    request.log.error({
      error,
      message: 'Failed at fetching sensitive data from provider',
    })
    
    reply.statusCode = 500
    return { customer: null, error: true }
  }
})

server.listen({ port: '1234' })
```

##### provider.js

```js
const { fetch } = require('undici')

const MAGIC_KEY = '12345'

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms))

exports.thirdPartyMagicKeyGenerator = async (ms) => {
  // Simulate processing delay
  await delay(ms)

  // Simulate webhook request to our server
  const { status } = await fetch(
    'http://localhost:1234/webhook',
    {
      body: JSON.stringify({ magicKey: MAGIC_KEY }),
      method: 'POST',
    },
  )

  if (status !== 200) {
    throw new Error('Failed to fetch magic key')
  }
}

exports.fetchSensitiveData = async (key) => {
  // Simulate processing delay
  await delay(700)
  const data = { sensitive: true }
  
  if (key === MAGIC_KEY) {
    return data
  }
  
  throw new Error('Invalid key')
}
```

##### delay-incoming-requests.js

```js
const fp = require('fastify-plugin')

const provider = require('./provider')

const USUAL_WAIT_TIME_MS = 5000

async function delayIncomingRequests(fastify) {
  // As soon as we're listening for requests, let's work our magic
  fastify.server.on('listening', doMagic)

  // Set up the placeholder for the magicKey
  fastify.decorate('magicKey', null)

  // Make sure customer requests won't be accepted if the magicKey is not
  // available
  // For this example, say our customer requests are all under a `/v1` path
  fastify.addHook('onRequest', (request, reply, next) => {
    if (!request.server.magicKey && request.url.startsWith('/v1')) {
      reply.statusCode = 503
      reply.send({ error: true, retryInMs: USUAL_WAIT_TIME_MS })
      return
    }

    next()
  })

  // Our magic -- important to make sure errors are handled. Beware of async
  // functions outside `try/catch` blocks
  // If an error is thrown at this point and not captured it'll crash the
  // application
  function doMagic() {
    fastify.log.info('Doing magic!')

    provider.thirdPartyMagicKeyGenerator(USUAL_WAIT_TIME_MS)
      .catch((error) => {
        fastify.log.error({
          error,
          message: 'Got an error while trying to get the magic key!'
        })

        // Since we won't be able to serve requests, might as well wrap
        // things up
        fastify.close(() => process.exit(1))
      })
  }
}

module.exports = fp(delayIncomingRequests)
```

There is a very specific change on the previously existing files that is worth
mentioning: Beforehand we were using the `server.listen` callback to start the
authentication process with the external provider and we were decorating the
`server` object right before initializing the server. That was bloating our
server initialization setup with unnecessary code and didn't really have much to
do with starting the Fastify server. It was a business logic that didn't have
its specific place in the code base.

Now we've implemented the `delayIncomingRequests` plugin in the
`delay-incoming-requests.js` file. That's the brains of our operation. Let's
walk through what the plugin does:

```js
  fastify.server.on('listening', doMagic)
```

As soon as the server starts listening (very similar behavior as to adding a
piece of code to the `server.listen`'s callback function) a `listening` event
is emitted (fore more info refer to https://nodejs.org/api/net.html#event-listening).
We use that to reach out to our provider as soon as possible, with the `doMagic`
function.

```js
  fastify.decorate('magicKey', null)
```

The `magicKey` decoration is also part of the plugin now. We initialize it with
a placeholder, waiting for the valid value to be retrieved.

```js
  fastify.addHook('onRequest', (request, reply, next) => {
    if (!request.server.magicKey && request.url.startsWith('/v1')) {
      reply.statusCode = 503
      reply.header('Retry-After', USUAL_WAIT_TIME_MS)
      reply.send({ error: true, retryInMs: USUAL_WAIT_TIME_MS })
      return
    }

    next()
  })
```

Instead of updating each and every single controller that might use the
`magicKey`, we simply make sure that no path that's related to customer requests
will be served until we have everything ready. And there's more: we fail
**FAST** and have the possibility of giving the customer meaningful information,
like how long they should wait before retrying the request. Going even further,
by issuing a
[`503` status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/503)
we're signaling to our infrastructure components (namely load balancers) we're
still not ready to take incoming requests and they should redirect traffic
to other instances, if available, besides in how long we estimate that will be
solved. All of that in a few simple lines!

Let's see how that behaves in action. If we fire our server up with
`node index.js` and made a few requests to test things out. These were the logs
we'd see (some bloat was removed to ease things up):

```
{"time":1650063793316,"msg":"Doing magic!"}
{"time":1650063793316,"msg":"Server listening at http://127.0.0.1:1234"}
{"time":1650063795030,"reqId":"req-1","req":{"method":"GET","url":"/v1","hostname":"localhost:1234","remoteAddress":"127.0.0.1","remotePort":51928},"msg":"incoming request"}
{"time":1650063795033,"reqId":"req-1","res":{"statusCode":503},"responseTime":2.5721680000424385,"msg":"request completed"}
{"time":1650063796248,"reqId":"req-2","req":{"method":"GET","url":"/ping","hostname":"localhost:1234","remoteAddress":"127.0.0.1","remotePort":51930},"msg":"incoming request"}
{"time":1650063796248,"reqId":"req-2","res":{"statusCode":200},"responseTime":0.4802369996905327,"msg":"request completed"}
{"time":1650063798377,"reqId":"req-3","req":{"method":"POST","url":"/webhook","hostname":"localhost:1234","remoteAddress":"127.0.0.1","remotePort":51932},"msg":"incoming request"}
{"time":1650063798379,"reqId":"req-3","msg":"Ready for customer requests!"}
{"time":1650063798379,"reqId":"req-3","res":{"statusCode":200},"responseTime":1.3567829988896847,"msg":"request completed"}
{"time":1650063799858,"reqId":"req-4","req":{"method":"GET","url":"/v1","hostname":"localhost:1234","remoteAddress":"127.0.0.1","remotePort":51934},"msg":"incoming request"}
{"time":1650063800561,"reqId":"req-4","res":{"statusCode":200},"responseTime":702.4662979990244,"msg":"request completed"}
```

Let's focus on a few parts:

```
{"time":1650063793316,"msg":"Doing magic!"}
{"time":1650063793316,"msg":"Server listening at http://127.0.0.1:1234"}
```

These are the initial logs we'd see as soon as the server started. We reach out
to the external provider as early as possible within a valid time window (we
couldn't do that before the server was ready to receive connections).

While the server is still not ready, a few requests are attempted:

```
{"time":1650063795030,"reqId":"req-1","req":{"method":"GET","url":"/v1","hostname":"localhost:1234","remoteAddress":"127.0.0.1","remotePort":51928},"msg":"incoming request"}
{"time":1650063795033,"reqId":"req-1","res":{"statusCode":503},"responseTime":2.5721680000424385,"msg":"request completed"}
{"time":1650063796248,"reqId":"req-2","req":{"method":"GET","url":"/ping","hostname":"localhost:1234","remoteAddress":"127.0.0.1","remotePort":51930},"msg":"incoming request"}
{"time":1650063796248,"reqId":"req-2","res":{"statusCode":200},"responseTime":0.4802369996905327,"msg":"request completed"}
```

The first one (`req-1`) was a `GET /v1`, that failed (**FAST** - `responseTime`
is in `ms`) with our `503` status code and the meaningful information in the
response. Below is the response for that request:

```
HTTP/1.1 503 Service Unavailable
Connection: keep-alive
Content-Length: 31
Content-Type: application/json; charset=utf-8
Date: Fri, 15 Apr 2022 23:03:15 GMT
Keep-Alive: timeout=5
Retry-After: 5000

{
    "error": true,
    "retryInMs": 5000
}
```

Then we attempt a new request (`req-2`), which was a `GET /ping`. As expected,
since that was not one of the requests we asked our plugin to filter, it
succeeded. That could also be used as means of informing an interested party
whether or not we were ready to serve requests (although `/ping` is more
commonly associated with _liveness_ checks and that would be the responsibility
of a _readiness_ check -- the curious reader can get more info on these terms
[here](https://cloud.google.com/blog/products/containers-kubernetes/kubernetes-best-practices-setting-up-health-checks-with-readiness-and-liveness-probes)) with the `ready` field.
Below is the response for that request:

```
HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 29
Content-Type: application/json; charset=utf-8
Date: Fri, 15 Apr 2022 23:03:16 GMT
Keep-Alive: timeout=5

{
    "error": false,
    "ready": false
}
```

After that there were more interesting log messages:

```
{"time":1650063798377,"reqId":"req-3","req":{"method":"POST","url":"/webhook","hostname":"localhost:1234","remoteAddress":"127.0.0.1","remotePort":51932},"msg":"incoming request"}
{"time":1650063798379,"reqId":"req-3","msg":"Ready for customer requests!"}
{"time":1650063798379,"reqId":"req-3","res":{"statusCode":200},"responseTime":1.3567829988896847,"msg":"request completed"}
```

This time it was our simulated external provider hitting us to let us know
authentication had gone well and telling us what our `magicKey` was. We saved
that into our `magicKey` decorator and celebrated with a log message saying we
were now ready for customers to hit us!

```
{"time":1650063799858,"reqId":"req-4","req":{"method":"GET","url":"/v1","hostname":"localhost:1234","remoteAddress":"127.0.0.1","remotePort":51934},"msg":"incoming request"}
{"time":1650063800561,"reqId":"req-4","res":{"statusCode":200},"responseTime":702.4662979990244,"msg":"request completed"}
```

Finally, a final `GET /v1` request was made and, this time, it succeeded. Its
response was the following:

```
HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 31
Content-Type: application/json; charset=utf-8
Date: Fri, 15 Apr 2022 23:03:20 GMT
Keep-Alive: timeout=5

{
    "customer": true,
    "error": false
}
```

## Conclusion

This is the gist of it. Of course the specifics of the implementation will vary
from a problem to another, but the main goal of this guide was to show a very
specific use case of an issue that could be solved within Fastify's ecosystem.

The keywords here were [Decorators](../Reference/Decorators.md),
[Hooks](../Reference/Hooks.md) and [Plugins](../Reference/Plugins.md). Combining
what Fastify has to offer can lead to very ingenuous and creative solution to a
wide variety of problems. Let's be creative! :)
