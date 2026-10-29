# HTTP/3 using a custom server factory

This experimental example uses
[`@currentspace/http3`](https://github.com/currentspace/http3) to run Fastify
handlers over HTTP/3, with HTTP/2 and HTTP/1.1 fallback on the same port.
HTTP/3 uses UDP; the fallback protocols use TCP. Routes, hooks, validation and
serialization run in Fastify for each protocol.

This is an optional external transport integration, not a new Fastify core
transport or a claim that every Fastify plugin supports HTTP/3.

## Requirements

- Node.js 24 or later.
- macOS arm64 or Linux glibc x64/arm64 for the package's native prebuilds.
- A PEM private key and certificate, trusted by the client.
- Both UDP and TCP access to the listening port.

The example uses the portable runtime so Linux does not require io_uring.
See the package's
[support matrix](https://github.com/currentspace/http3/blob/main/docs/SUPPORT_MATRIX.md)
for other environments.

## Run

From the Fastify repository root:

```sh
npm install
npm install --prefix examples/http3
TLS_KEY_FILE=/path/to/key.pem TLS_CERT_FILE=/path/to/cert.pem \
  npm start --prefix examples/http3
```

The server binds `127.0.0.1:8443` by default.
Set `HOST` and `PORT` to override it.
It serves `/api/protocol`, reporting the protocol used for the request.
Set `STATIC_ROOT` to an absolute SPA build directory to enable static hosting.
HTML navigation requests to missing non-API paths serve `index.html`; missing
assets and API paths otherwise return 404. Keep private files outside that root.

To confirm HTTP/3 with a QUIC-enabled curl build:

```sh
curl --http3-only --cacert /path/to/cert.pem https://localhost:8443/api/protocol
```

The response should contain `"httpVersion":"3.0"`. Ordinary `https.get` uses the
HTTP/1.1 fallback. The server advertises HTTP/3 with `Alt-Svc` so browsers can
learn the UDP endpoint after an initial HTTPS request. HTTPS alone does not
prove HTTP/3; inspect the negotiated protocol in browser developer tools.
If a load balancer changes the external port, override the `Alt-Svc` value.

## Integration

```js
const Fastify = require('fastify')
const { createNodeServerFactory } = require('@currentspace/http3/node')

const app = Fastify({
  https: { key, cert },
  serverFactory: createNodeServerFactory({
    key,
    cert,
    runtimeMode: 'portable',
    allowHTTP1: true
  })
})
```

Supply TLS credentials to the transport and set `https` on Fastify so its
listen address and secure request behavior are consistent. Do not set
`http2: true`; the external factory owns protocol selection.

## Boundaries

The transport provides Node-style request and response streams. Its H3/H2 raw
objects and socket metadata facade are not native Node HTTP/TCP objects.
Plugins requiring TCP sockets, upgrades/WebSockets, CONNECT, informational
responses, or `instanceof` checks are outside this example's support scope.
This JavaScript example does not extend Fastify's TypeScript raw server union.

Fastify's built-in server timeout options do not automatically configure a
custom factory. Configure the transport and application deadlines explicitly.
The transport limits unread H3 buffering to 1 MiB by default; Fastify's
`bodyLimit` still controls parsed body size.

`app.close()` waits for active response writes and asks sessions to close before
stopping the transport, with a 30-second forced-shutdown deadline. Native H3
session shutdown is best effort and does not guarantee acknowledgement of all
response bytes. Coordinate draining upstream before shutdown when required.

## Test

```sh
npm test --prefix examples/http3
```

The tests generate temporary certificates with OpenSSL and use real H3 and H2
connections. They cover routing, JSON parsing/validation, body limits, hooks,
streaming, HEAD, cookies, trailers, concurrent requests, cancellation, static
files, ranges, conditional requests, SPA fallback, HTTP/1.1 fallback and shutdown.
They are separate from Fastify's core suite so native dependencies remain opt-in.
