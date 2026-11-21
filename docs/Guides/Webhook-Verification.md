<h1 align="center">Fastify</h1>

# Webhook Signature Verification

## Introduction

Webhooks from services such as Stripe, GitHub, Shopify, Slack, and Svix protect
against replay and tampering attacks by signing payloads with an HMAC secret. The
service sends a cryptographic signature in an HTTP header (for example,
`stripe-signature` or `x-hub-signature-256`), and your server verifies that the
signature matches an HMAC hash calculated over the incoming request payload.

Signature verification requires the **exact, raw bytes** received over the
network. If a payload is parsed into an object and re-serialized with
`JSON.stringify()`, subtle differences in formatting, whitespace, object key
ordering, or number representations will cause the HMAC hash to differ, and
verification will fail.

Fastify's default JSON parser streams incoming requests directly into its parser
for maximum performance without storing the raw payload in memory. This guide
explains how to verify webhook signatures efficiently without sacrificing
performance or adding unnecessary overhead to the rest of your application.

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
4. All other routes outside the plugin retain Fastify's default streaming JSON
   parser.

### Example: GitHub Webhook Verification

```js
import Fastify from 'fastify'
import crypto from 'node:crypto'

const fastify = Fastify()
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-secret'

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

    // Safely parse JSON after verification succeeds
    const payload = JSON.parse(request.body.toString('utf8'))

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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const fastify = Fastify()

await fastify.register(async function stripeWebhook (app) {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body)
  })

  app.post('/webhook/stripe', async (request, reply) => {
    const signature = request.headers['stripe-signature']

    let event
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
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
```

## Dual Access: Raw Buffer and Parsed Body

If you want both `request.rawBody` as a `Buffer` **and** `request.body` as the
parsed JSON object without manually calling `JSON.parse()`, you can capture the
stream in a route-level `preParsing` hook:

```js
fastify.post('/webhook', {
  preParsing: (request, reply, payload, done) => {
    const chunks = []
    payload.on('data', chunk => chunks.push(chunk))
    payload.on('end', () => {
      request.rawBody = Buffer.concat(chunks)
    })
    done(null, payload)
  }
}, async (request, reply) => {
  // request.rawBody holds the exact bytes received over the wire
  // request.body holds the parsed JSON object
  const isValid = verifySignature(request.rawBody, request.headers['x-signature'])
  if (!isValid) {
    return reply.code(401).send({ error: 'Invalid signature' })
  }

  return { received: true, action: request.body.action }
})
```

## Community Plugin: `fastify-raw-body`

For larger applications that expose multiple webhook providers or routes where
you prefer an automated helper, the community plugin
[`fastify-raw-body`](https://github.com/Eomm/fastify-raw-body) provides a route
option `config: { rawBody: true }` to automatically populate `request.rawBody`
on selected endpoints without storing the raw body on non-webhook routes.
