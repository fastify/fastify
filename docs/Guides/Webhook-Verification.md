<h1 align="center">Fastify</h1>

# Webhook Signature Verification

## Introduction

Webhooks from services such as Stripe, GitHub, Shopify, Slack, and Svix sign
payloads using an HMAC secret so your server can authenticate the payload's
integrity and origin (assuming the secret remains secure). The service sends a
cryptographic signature in an HTTP header (for example, `stripe-signature` or
`x-hub-signature-256`), and your server verifies that the signature matches an
HMAC hash calculated over the incoming request payload.

Signature verification detects payload tampering, but verification alone does
not prevent replay attacks: a valid signed request can still be captured and
resent. To mitigate replay attacks, developers must implement provider-specific
defenses, such as validating timestamp headers within a tolerance window or
deduplicating delivery IDs.

Signature verification requires the **exact, raw bytes** received over the
network. If a payload is parsed into an object and re-serialized with
`JSON.stringify()`, subtle differences in formatting, whitespace, object key
ordering, or number representations will cause the HMAC hash to differ, and
verification will fail.

Fastify's default JSON parser collects the complete request payload in memory
before decoding and parsing it, but it does not retain a separate `rawBody`
buffer on the request object. Developers who need the exact original bytes for
signature verification must explicitly capture them or use an appropriate
content type parser or plugin. This guide explains how to verify webhook
signatures efficiently without sacrificing performance or adding unnecessary
overhead to the rest of your application.

## The Pitfall: Re-stringifying Parsed JSON

A common mistake is attempting to verify a signature using the parsed request
body:

```js
// ❌ WRONG: JSON.stringify will not produce the identical raw byte sequence!
const signature = request.headers['x-hub-signature-256']
const reconstructed = JSON.stringify(request.body)
const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(reconstructed).digest('hex')
```

Even though `request.body` represents the same data, the string produced by
`JSON.stringify()` may differ from the sender's wire format in whitespace or key
order. To verify signatures correctly, you must access the original payload as a
`Buffer` or raw string.

## Recommended Pattern: Route-Scoped Parser via Encapsulation

Fastify's plugin architecture provides context encapsulation. Rather than
globally altering body parsing across your entire server, you can configure a
dedicated content type parser that runs **only** for your webhook routes.

In this pattern:
1. Webhook routes are registered within an encapsulated plugin.
2. Inside that plugin, `addContentTypeParser` is configured with
   `{ parseAs: 'buffer' }`.
3. The route handler receives `request.body` as a `Buffer`, verifies the
   signature, and parses the JSON when valid.
4. All other routes outside the plugin retain Fastify's default JSON parser.

### Example: GitHub Webhook Verification

```js
import Fastify from 'fastify'
import crypto from 'node:crypto'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
if (!WEBHOOK_SECRET) {
  throw new Error('WEBHOOK_SECRET is required')
}

const fastify = Fastify()

// Encapsulated webhook plugin
await fastify.register(async function webhookRoutes (app) {
  // Parse application/json as a raw Buffer within this plugin only
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body)
  })

  app.post('/webhook/github', async (request, reply) => {
    const signature = request.headers['x-hub-signature-256']
    if (!signature || typeof signature !== 'string') {
      return reply.code(400).send({ error: 'Missing x-hub-signature-256 header' })
    }

    // Compute expected HMAC digest over raw buffer
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
    hmac.update(request.body)
    const expected = 'sha256=' + hmac.digest('hex')

    // Use timingSafeEqual to protect against timing attacks
    const trusted = Buffer.from(expected, 'ascii')
    const untrusted = Buffer.from(signature, 'ascii')

    if (trusted.length !== untrusted.length || !crypto.timingSafeEqual(trusted, untrusted)) {
      return reply.code(401).send({ error: 'Invalid signature' })
    }

    // Safely parse JSON after verification succeeds using Fastify's default parser
    const defaultJsonParser = app.getDefaultJsonParser('error', 'error')
    const payload = await new Promise((resolve, reject) => {
      defaultJsonParser(request, request.body.toString('utf8'), (err, body) => {
        if (err) return reject(err)
        resolve(body)
      })
    })

    request.log.info({ event: payload.action }, 'Webhook verified successfully')
    return reply.code(200).send({ received: true })
  })
})

// Other routes outside the plugin use Fastify's standard JSON parser
fastify.post('/api/other', async (request, reply) => {
  // request.body is automatically parsed as a JSON object
  return { status: 'ok', data: request.body }
})

await fastify.listen({ port: 3000 })
```

### Example: Stripe Webhook Verification

Stripe's Node.js SDK expects the raw payload `Buffer` or string in its
`constructEvent` utility:

```js
import Fastify from 'fastify'
import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required')
}

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
if (!STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is required')
}

const stripe = new Stripe(STRIPE_SECRET_KEY)
const fastify = Fastify()

await fastify.register(async function stripeWebhook (app) {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body)
  })

  app.post('/webhook/stripe', async (request, reply) => {
    const signature = request.headers['stripe-signature']
    if (!signature || typeof signature !== 'string') {
      return reply.code(400).send({ error: 'Missing stripe-signature header' })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      request.log.error(err, 'Stripe webhook verification failed')
      return reply.code(400).send(`Webhook Error: ${err.message}`)
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        // Handle successful payment
        break
      default:
        request.log.info(`Unhandled event type: ${event.type}`)
    }

    return reply.code(200).send({ received: true })
  })
})

await fastify.listen({ port: 3000 })
```

## Dual Access: Raw Buffer and Parsed Body

If you want both `request.rawBody` as a `Buffer` **and** `request.body` as the
parsed JSON object without manually invoking Fastify's parser inside the route
handler, you can tap the stream in a `preParsing` hook.

### Hook Execution Order and Stream Encoding

Fastify executes application-level and encapsulated shared `preParsing` hooks
before route-level `preParsing` hooks. Consequently, a route-level hook receives
the payload stream only after earlier hooks have processed it.

This ordering introduces critical considerations for webhook verification:
- If an earlier hook calls `payload.setEncoding('utf8')` or replaces the stream,
  subsequent chunks emitted by the stream will be strings instead of `Buffer`
  instances.
- `Buffer.concat()` expects `Uint8Array` or `Buffer` elements; passing strings
  causes a runtime `TypeError`.
- Decoding raw wire bytes into strings (and later re-encoding them) can alter
  byte representations or silently drop bytes when multi-byte characters split
  across chunk boundaries, corrupting the exact sequence needed for
  cryptographic signature verification.
- Raw body collection must occur before any stream-decoding or transforming
  hooks run. If your application uses shared `preParsing` hooks, ensure that
  webhook routes are encapsulated in a plugin context free from decoding hooks,
  or register the raw-body collection hook upstream of transformations.

### Safe Raw-Body Collection with `preParsing`

A custom stream collector must enforce the effective body limit and manage
stream listener lifecycles cleanly to prevent memory leaks and
denial-of-service risks:

```js
fastify.post('/webhook', {
  preParsing: (request, reply, payload, done) => {
    let chunks = []
    let receivedLength = 0
    // request.routeOptions.bodyLimit reflects the route or server body limit
    const limit = request.routeOptions.bodyLimit

    function cleanup () {
      payload.removeListener('data', onData)
      payload.removeListener('end', onEnd)
      payload.removeListener('error', onError)
      request.raw.removeListener('close', onClose)
      request.raw.removeListener('aborted', onAborted)
      chunks = null
    }

    function onData (chunk) {
      // If an earlier hook decoded the stream into strings, abort collection
      if (typeof chunk === 'string') {
        cleanup()
        return
      }

      receivedLength += chunk.length
      if (receivedLength > limit) {
        // Exceeded limit: discard buffered data and detach listeners
        cleanup()
        return
      }

      chunks.push(chunk)
    }

    function onEnd () {
      if (chunks) {
        request.rawBody = Buffer.concat(chunks, receivedLength)
      }
      cleanup()
    }

    function onError () {
      cleanup()
    }

    function onClose () {
      if (!request.raw.complete) {
        cleanup()
      }
    }

    function onAborted () {
      cleanup()
    }

    payload.on('data', onData)
    payload.on('end', onEnd)
    payload.on('error', onError)
    request.raw.on('close', onClose)
    request.raw.on('aborted', onAborted)

    // Pass the stream through untouched to Fastify's content-type parser
    done(null, payload)
  }
}, async (request, reply) => {
  if (!request.rawBody) {
    return reply.code(400).send({ error: 'Unable to verify signature: raw body unavailable' })
  }

  const isValid = verifySignature(request.rawBody, request.headers['x-signature'])
  if (!isValid) {
    return reply.code(401).send({ error: 'Invalid signature' })
  }

  return { received: true, action: request.body.action }
})
```

In this implementation:
- **Synchronous Hook Completion:** Calling `done(null, payload)` synchronously
  guarantees that Fastify attaches its downstream content-type parser listeners
  in the same event-loop tick before the stream emits data, ensuring both the
  collector and the parser receive every chunk without race conditions.
- **Body Limit Responsibility:** The collector tracks captured bytes against
  `request.routeOptions.bodyLimit` (which resolves the effective route limit or
  the server-level `initialConfig.bodyLimit`). If the limit is exceeded, the
  collector stops buffering, dereferences retained chunks, and detaches its
  listeners. Fastify's downstream content-type parser independently enforces the
  body limit on the incoming stream and rejects oversized requests with
  HTTP 413.
- **Resource Cleanup and Abort Handling:** Listeners are detached and retained
  chunks are dereferenced upon stream completion (`end`), stream errors
  (`error`), client aborts (`aborted`), premature connection termination
  (`close` when `!request.raw.complete`), or limit breaches, preventing memory
  leaks and dangling references.
- **Encoding Safety:** If chunks arrive as strings due to an earlier hook,
  collection halts immediately rather than attempting string-to-Buffer
  conversion that would compromise the original wire bytes.

## Community Plugin: `fastify-raw-body`

For larger applications that expose multiple webhook providers or routes where
you prefer an automated helper, you can use the community plugin
[`fastify-raw-body`](https://github.com/Eomm/fastify-raw-body).

By default, `fastify-raw-body` operates with `{ global: true }`, which captures
and attaches `request.rawBody` on all routes across your application. To avoid
the memory overhead of buffering request bodies on non-webhook routes, register
the plugin with `{ global: false }`:

```js
import Fastify from 'fastify'
import rawBody from 'fastify-raw-body'

const fastify = Fastify()

await fastify.register(rawBody, {
  field: 'rawBody', // default: 'rawBody'
  global: false,    // do not capture bodies globally
  encoding: false,  // keep request.rawBody as a Buffer (default is 'utf8')
  runFirst: true    // run preParsing before other plugins
})

fastify.post('/webhook', {
  config: {
    rawBody: true   // opt in this route specifically
  }
}, async (request, reply) => {
  // request.rawBody holds the Buffer
  // request.body holds the parsed JSON object
  return { received: true }
})

await fastify.listen({ port: 3000 })
```

With `global: false`, only routes configured with `config: { rawBody: true }`
capture `request.rawBody`, keeping non-webhook routes fast and memory-efficient.
