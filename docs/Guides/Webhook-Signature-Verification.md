<h1 align="center">Fastify</h1>

# Webhook Signature Verification

## Introduction

Webhook providers such as Stripe, GitHub, and Svix sign the requests they
send you. To verify a signature you compute an HMAC over the request body
using a shared secret and compare it against the value in a header. The
comparison only holds if you hash the exact bytes the provider signed, that
is the body as it arrived on the wire, before any parsing or re-serialization.

By default Fastify parses `application/json` bodies for you, so by the time a
route handler runs, `request.body` is a JavaScript object and the original
bytes are gone. Rebuilding those bytes with `JSON.stringify(request.body)` is
not safe (see [The re-serialization gotcha](#the-re-serialization-gotcha)).

This guide shows how to obtain the raw body for a single webhook route so you
can verify a signature, without changing body parsing for the rest of your
application. Core Fastify does not expose the raw body as a built-in option;
the recipes below use existing APIs to capture it only where you need it. If
you would rather use a plugin, [`fastify-raw-body`](https://github.com/Eomm/fastify-raw-body)
covers the same ground.

## Recipe: a route-scoped buffer parser

Content type parsers are encapsulated in the scope in which they are declared
(see [`ContentTypeParser`](../Reference/ContentTypeParser.md)). Registering the
webhook route inside its own plugin means the custom parser applies only to
that scope, and every other route keeps the default JSON parsing.

The parser uses the `parseAs: 'buffer'` option (this is already the default;
it is kept here to make the intent explicit) so Fastify collects the body into
a `Buffer` and enforces the body limit for you. Instead of parsing that buffer,
the parser returns it unchanged, so `request.body` is the raw bytes. Because
`request.body` is a `Buffer` rather than a parsed object, do not attach a JSON
body schema to this route: `schema.body` validation would run against the
`Buffer` and reject it. If you need both the raw bytes and a validated JSON
body, use the [preParsing variant](#variant-a-preparsing-hook) below, which
keeps `request.body` parsed. Only `application/json` is overridden here, so
requests sent with another content type keep the parser they inherit from the
parent scope; confirm your provider sends JSON.

```js
const crypto = require('node:crypto')
const Fastify = require('fastify')

const app = Fastify()

// Compare with a constant-time function to avoid leaking timing
// information. `crypto.timingSafeEqual` requires two buffers of equal
// length, so guard the length before calling it. The signature header may
// be absent or, on duplicate headers, an array, so normalize it to a
// string first.
function verify (signature, expected) {
  const value = Array.isArray(signature) ? signature[0] : signature
  const provided = Buffer.from(value ?? '', 'utf8')
  const computed = Buffer.from(expected, 'utf8')

  return (
    provided.length === computed.length &&
    crypto.timingSafeEqual(provided, computed)
  )
}

// The webhook route lives in its own encapsulated plugin, so this parser
// does not affect JSON parsing anywhere else in the application.
app.register(async function webhookRoutes (instance) {
  instance.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (request, body, done) => {
      // `body` is the exact byte sequence received on the wire.
      // Return it as-is instead of parsing it to JSON.
      done(null, body)
    }
  )

  instance.post('/webhooks/provider', (request, reply) => {
    const rawBody = request.body // a Buffer
    const signature = request.headers['x-signature']

    // This example compares a plain HMAC of the body against a single
    // header. Real providers use their own format (see the note below);
    // adapt the signed string to match, but always hash the raw bytes.
    const expected = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')

    if (!verify(signature, expected)) {
      reply.code(401).send({ error: 'invalid signature' })
      return
    }

    // JSON.parse throws on a malformed body; wrap it in try/catch if you
    // want to return 400 rather than let it surface as a 500.
    const event = JSON.parse(rawBody.toString('utf8'))
    request.log.info({ type: event.type }, 'verified webhook')
    reply.send({ received: true })
  })
})

// Every other route keeps the default parser: `request.body` here is
// already-parsed JSON, exactly as before.
app.post('/orders', (request, reply) => {
  reply.send({ ok: true })
})

app.listen({ port: 3000 }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
```

The handler calls the `verify` helper defined above, which compares the
signatures in constant time. Keep it in the same module as the route.

Each provider documents its own exact signature format. Stripe and Svix, for
example, sign a payload that combines a timestamp with the body, and GitHub
prefixes the digest with `sha256=`. Build the signed string exactly as the
provider specifies; the point that matters here is that the body portion must
be the raw bytes captured above, never a re-serialized object.

A valid signature proves the payload was signed with your secret, but not
that it is recent. Where the provider signs a timestamp, check that it falls
within a short tolerance window (a few minutes) and reject anything older, or
a captured request can be replayed later. Use the tolerance your provider
documents.

## Variant: a preParsing hook

If you cannot change the content type parser, or you want to keep parsing the
body as JSON while also keeping the original bytes, capture the payload in a
[`preParsing`](../Reference/Hooks.md#preparsing) hook. Adding the hook inside
an encapsulated plugin scopes it to the routes in that plugin.

The hook receives the payload stream and must return a stream. Buffer the
incoming chunks, stash the result on the request, and return a fresh stream
built from the same bytes so Fastify can parse the body as usual. Set
`receivedEncodedLength` so Fastify can match the payload against the
`Content-Length` header. Unlike the buffer parser, this hook collects the
whole payload before Fastify checks the body limit on the returned stream, so
add your own size guard to avoid buffering an unbounded request. The example
below reads `request.routeOptions.bodyLimit`, the effective limit for the
route (the per-route override if set, otherwise the global one), and rejects
anything larger. The handler uses the same constant-time `verify` helper as the
buffer parser recipe, repeated here so this example runs on its own.

```js
const crypto = require('node:crypto')
const { Readable } = require('node:stream')
const Fastify = require('fastify')

const app = Fastify()

// Same constant-time comparison as the buffer parser recipe: guard the
// length before `crypto.timingSafeEqual`, and normalize a missing or
// array-valued signature header to a string first.
function verify (signature, expected) {
  const value = Array.isArray(signature) ? signature[0] : signature
  const provided = Buffer.from(value ?? '', 'utf8')
  const computed = Buffer.from(expected, 'utf8')

  return (
    provided.length === computed.length &&
    crypto.timingSafeEqual(provided, computed)
  )
}

app.register(async function webhookRoutes (instance) {
  instance.decorateRequest('rawBody', null)

  instance.addHook('preParsing', (request, reply, payload, done) => {
    const limit = request.routeOptions.bodyLimit
    const chunks = []
    let size = 0
    let aborted = false

    // `aborted` guards against calling `done` more than once: `destroy`
    // and a same-tick `end` could otherwise both settle the hook.
    payload.on('data', (chunk) => {
      if (aborted) return
      size += chunk.length
      if (size > limit) {
        aborted = true
        payload.destroy()
        const error = new Error('Request body is too large')
        error.statusCode = 413
        done(error)
        return
      }
      chunks.push(chunk)
    })

    payload.on('end', () => {
      if (aborted) return
      const rawBody = Buffer.concat(chunks)
      request.rawBody = rawBody

      const stream = Readable.from(rawBody)
      stream.receivedEncodedLength = rawBody.length
      done(null, stream)
    })

    payload.on('error', (err) => {
      if (aborted) return
      aborted = true
      done(err)
    })
  })

  instance.post('/webhooks/provider', (request, reply) => {
    // request.body is the parsed JSON; request.rawBody is the Buffer.
    const expected = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(request.rawBody)
      .digest('hex')

    if (!verify(request.headers['x-signature'], expected)) {
      reply.code(401).send({ error: 'invalid signature' })
      return
    }

    reply.send({ received: true })
  })
})

app.listen({ port: 3000 }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
```

This variant keeps `request.body` as parsed JSON and adds `request.rawBody`
alongside it. Because `request.body` stays the parsed object, a JSON
`schema.body` still validates normally here, unlike the buffer parser recipe.
The buffer parser recipe is lighter when the handler does not need the parsed
object as well.

Note the ordering: this variant runs the normal JSON parser before your
handler, so a malformed or unsigned body produces a parse error (400) before
the signature check runs. When it matters that verification happens before any
parsing, prefer the buffer parser recipe, which hands you the raw bytes with
no prior parse.

## The re-serialization gotcha

It is tempting to skip the raw body entirely and hash
`JSON.stringify(request.body)`. This does not work. `JSON.stringify` produces
one valid encoding of the object, but the provider signed the specific bytes
it sent, and those two rarely match. Key order, insignificant whitespace,
number formatting, and the escaping of non-ASCII characters can all differ
between what the provider sent and what `JSON.stringify` produces. Any single
byte of difference changes the HMAC and the check fails, or worse, appears to
pass in testing and then breaks on a payload that happens to serialize
differently.

Always verify the signature against the exact bytes received on the wire,
which is what both recipes above give you.

## Conclusion

Fastify does not carry the raw request body by default, but you can capture it
for a single route without touching parsing elsewhere. A route-scoped content
type parser with `parseAs: 'buffer'` gives you `request.body` as the raw bytes,
and a `preParsing` hook lets you keep the parsed body while also keeping the
original payload. In both cases the signature check must run against the bytes
as received, because a re-serialized body is not a faithful copy of what the
provider signed.
