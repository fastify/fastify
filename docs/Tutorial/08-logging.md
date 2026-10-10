# Logging and monitoring

Quote Vault already has logging enabled with `logger: true`. So far, we have
mostly treated its output as confirmation that the server started. In this
chapter, we will turn those records into useful operational information while
keeping sensitive data out of them.

Fastify uses [Pino](https://getpino.io/) for low-overhead structured logging.
The complete Fastify API is documented in the
[Logging reference](../Reference/Logging.md).

## Observe Fastify's request logs

Start the application:

```bash
node server.ts
```

From a second terminal, make an authenticated request:

```bash
curl -i http://localhost:3000/quotes \
  -H "Authorization: Bearer user"
```

Fastify writes three kinds of records that are useful here:

* one or more server-listening records when the application starts;
* an incoming-request record containing the request method and URL;
* and a request-completed record containing the status code and response time.

With the current `logger: true` configuration, the output has this shape. The
angle-bracketed values change on every run:

<!-- markdownlint-disable MD013 -->

```text
{"level":30,"time":<unix-time-ms>,"pid":<process-id>,"hostname":"<host>","msg":"Server listening at http://127.0.0.1:3000"}
{"level":30,"time":<unix-time-ms>,"pid":<process-id>,"hostname":"<host>","reqId":"req-1","req":{"method":"GET","url":"/quotes"},"msg":"incoming request"}
{"level":30,"time":<unix-time-ms>,"pid":<process-id>,"hostname":"<host>","reqId":"req-1","res":{"statusCode":200},"responseTime":<milliseconds>,"msg":"request completed"}
```

<!-- markdownlint-enable MD013 -->

Each record is written as an independent JSON object on one line. The records
include these common fields:

* `level`: the numeric severity;
* `time`: the Unix timestamp in milliseconds;
* `pid`: the running Node.js process identifier;
* `hostname`: the name of the machine running the process;
* `msg`: a stable description of the event;
* `reqId`: the identifier shared by records for one request.

The request ID is different from the process ID: `reqId` identifies one HTTP
request, while `pid` identifies the running Node.js process.

The incoming and completed records for the request have the same `reqId`. The
server-listening record does not, because it is an application event rather
than part of an HTTP request.

Stop the server with `Ctrl+C` before continuing.

## Choose the logger that owns the context

Fastify exposes two kinds of logger context:

* Use `.log` on the Fastify instance, for example `app.log` or `instance.log`,
  depending on the variable name. This logger is for application startup,
  shutdown, resource lifecycle, and other work that does not belong to an HTTP
  request.
* Use `request.log` or `reply.log` during a request. These loggers inherit the
  request ID and its other bindings.

The `instance.log` call in our `onClose` hook is already an application log.
Now add a request-scoped event to the successful quote-creation path:

```ts
// server.ts - replace the existing POST route
app.post(
  '/quotes',
  {
    schema: {
      body: quoteBody,
      response: singleQuoteResponse
    }
  },
  function (request, reply) {
    const quote = this.quotesRepository.create(request.body.text)
    request.log.info({ quoteId: quote.id }, 'quote created')
    const demo = { ...quote, secret: 'do-not-leak' } // removed by serializer
    reply.code(201)
    return demo
  }
)
```

The message stays constant, while `quoteId` is a structured field that tools
can filter and aggregate. Avoid interpolating identifiers into messages: doing
so creates many different messages for the same event.

## Choose log levels deliberately

A logger level is a threshold. At the `info` threshold, `info`, `warn`,
`error`, and `fatal` records are emitted, while `debug` and `trace` records are
dropped.

For now, use these levels as follows:

* `debug` for diagnostic details that are normally disabled in production;
* `info` for expected lifecycle and business events, such as quote creation;
* `warn` for an unexpected or degraded condition from which the request or
  application can recover;
* `error` when an operation failed and needs investigation.

Pino also provides `trace` for very detailed diagnostics and `fatal` when the
application cannot continue. Do not add a log call merely to demonstrate every
level. Even diagnostic logs consume resources and storage when their level is
enabled.

Fastify can set a [`logLevel` for a route or plugin](../Reference/Routes.md#custom-log-level),
but Quote Vault does not need a special per-route threshold yet.

## Keep development output readable

JSON remains the right production format, but a formatter makes local terminal
output easier to scan. Install `pino-pretty` as a development dependency:

```bash
npm install --save-dev pino-pretty
```

Next, replace the imports and Fastify construction at the beginning of
`server.ts` with the following code:

```ts
import fastify from 'fastify'
import type { FastifyServerOptions } from 'fastify'
import closeWithGrace from 'close-with-grace'
import { createDb } from './db.ts'
import { createQuotesRepository } from './quotes-repository.ts'
import configureHooks from './hooks.ts'
import {
  idParam, quoteBody, listQuery,
  listQuotesResponse, singleQuoteResponse, deleteQuoteResponse,
  errorMessage
} from './schemas.ts'
import type {
  TypeBoxTypeProvider
} from '@fastify/type-provider-typebox'

const logger: FastifyServerOptions['logger'] = {
  level: 'info',
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'authorization',
    'cookie',
    'password'
  ],
  ...(process.stdout.isTTY
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z'
          }
        }
      }
    : {})
}

const app = fastify({
  logger,
  // Allow in-flight requests to finish after app.close() starts.
  forceCloseConnections: false,
  ajv: {
    customOptions: {
      // Explicitly disable allErrors to avoid CVE-2020-8192 risk
      allErrors: false,
      // Remove properties not in schema
      removeAdditional: 'all'
    }
  }
}).withTypeProvider<TypeBoxTypeProvider>()
```

Fastify still creates and owns the Pino logger. When standard output is an
interactive terminal, the transport presents readable, colored records. When
output is redirected or collected, `process.stdout.isTTY` is false and Fastify
keeps writing newline-delimited JSON.

This separates presentation from application log calls. Route handlers do not
need to know whether a developer or a production collector will read them.

## Protect sensitive and untrusted data

The safest sensitive value is one that never reaches a log call. Do not log
passwords, bearer tokens, session identifiers, cookies, or complete request and
response bodies. Log only the fields needed to investigate an event, and use
application-controlled top-level keys instead of spreading user objects into a
record.

The [`redact` paths in our logger
configuration](https://github.com/pinojs/pino/blob/main/docs/redaction.md) are a
second layer of defense. If one of those exact properties is logged later,
Pino replaces its value with `[Redacted]`. Redaction paths are case-sensitive
and describe the shape of the logged object, so define and review them when the
application starts. Never construct a redaction path from user input.

Fastify's default request serializer does not log request bodies or headers.
The body is not even parsed when Fastify creates the request child logger. We
therefore do not add a custom serializer or a global body-logging hook merely
to demonstrate redaction.

## Verify correlation and output formats

Start the server in an interactive terminal:

```bash
node server.ts
```

Create a quote from another terminal:

```bash
curl -i -X POST http://localhost:3000/quotes \
  -H "Authorization: Bearer admin" \
  -H "Content-Type: application/json" \
  -d '{"text":"Logging stays structured"}'
```

The terminal should now show readable logs. Find the `quote created` record and
confirm that it contains `quoteId` and the same `reqId` as the incoming and
completed records for that request.

The output now has this shape:

```text
[HH:MM:SS UTC] INFO (<process-id>): incoming request
    reqId: "req-1"
    req: {
      "method": "POST",
      "url": "/quotes"
    }
[HH:MM:SS UTC] INFO (<process-id>): quote created
    reqId: "req-1"
    quoteId: 1
[HH:MM:SS UTC] INFO (<process-id>): request completed
    reqId: "req-1"
    res: {
      "statusCode": 201
    }
    responseTime: <milliseconds>
```

Each record begins with a formatted timestamp and log level. The number in
parentheses is the Node.js process ID. Request records then show their `reqId`
and structured context, such as `quoteId` for the quote-creation event.

Also confirm that logging did not change the HTTP behavior:

```bash
# Rejected authentication: 401 Unauthorized
curl -i http://localhost:3000/quotes

# Validation failure: 400 Bad Request
curl -i -X POST http://localhost:3000/quotes \
  -H "Authorization: Bearer admin" \
  -H "Content-Type: application/json" \
  -d '{}'

# Missing quote: 404 Not Found
curl -i http://localhost:3000/quotes/999 \
  -H "Authorization: Bearer user"
```

Stop the server with `Ctrl+C`. The `closing database` and
`Server closed gracefully` records are application events, so they have no
request-specific `reqId`.

Now start a fresh process with standard output redirected to a file:

```bash
node server.ts > quote-vault.log 2>&1
```

Because Node's output is now a file rather than a terminal, the captured
records remain newline-delimited JSON. From a second terminal, send a request
containing values that must not appear in logs:

```bash
curl -i -X POST http://localhost:3000/quotes \
  -H "Authorization: Bearer admin" \
  -H "Cookie: session=cookie-do-not-log" \
  -H "Content-Type: application/json" \
  -d '{"text":"body-do-not-log","password":"password-do-not-log"}'
```

Stop the redirected server with `Ctrl+C`. Validate that every captured line is
JSON:

```bash
node --input-type=module -e \
  "import { readFileSync } from 'node:fs';
  const lines = readFileSync('quote-vault.log', 'utf8').trim().split('\n');
  for (const line of lines) JSON.parse(line);
  console.log('Every line is valid JSON')"
```

Search for the credentials, cookie, and body values:

```bash
grep -E 'Bearer admin|cookie-do-not-log|password-do-not-log|body-do-not-log' quote-vault.log
```

The search should produce no output. The redirect leaves `quote-vault.log` in
the project directory; remove it when you no longer need the captured logs.

## Add a liveness endpoint

Health checks are a monitoring tool, and their frequency also affects log
volume. A deployment platform needs a cheap way to determine whether an
application process is running and able to serve HTTP requests. It may perform
this check every few seconds, creating repetitive request records during normal
operation.

We will add a liveness endpoint with a small, stable response, then configure
Fastify to suppress only its routine records without hiding logs for the rest
of the API. In this tutorial, `/health` is public and does not require an
`Authorization` header.

In a deployed application, a health endpoint can still be protected by a
private network, a load balancer, mutual TLS, or credentials configured on the
probe. Return only the minimum status information even when access is
restricted.

First, add the response schema:

```ts
// schemas.ts - after listQuery
export const healthResponse = {
  200: Type.Object(
    {
      status: Type.Literal("ok"),
    },
    { additionalProperties: false }
  ),
};
```

Update the `onRequest` authentication hook to skip this specific route:

```ts
// hooks.ts - at the beginning of the onRequest hook
if (
  request.method === 'GET' &&
  request.routeOptions.url === '/health'
) {
  return;
}
```

Both the method and registered route pattern are checked, so this exception
applies only to `GET /health`. We will introduce a broader public-route policy
when the application gains more public endpoints in the Authentication
chapter.

Import `healthResponse` in `server.ts`, then register the route after
`configureHooks(app)` and before the quote routes:

```ts
// server.ts - add healthResponse to the existing schema imports
import {
  idParam, quoteBody, listQuery,
  listQuotesResponse, singleQuoteResponse, deleteQuoteResponse,
  errorMessage, healthResponse
} from './schemas.ts'

// server.ts - after configureHooks(app)
app.get(
  '/health',
  {
    schema: {
      response: healthResponse
    }
  },
  async function () {
    return { status: 'ok' as const }
  }
)
```

The `as const` assertion keeps `status` typed as the literal value required by
the response schema.

Restart the server and call the endpoint without an authorization header:

```bash
curl -i http://localhost:3000/health
```

The response confirms that the process can serve requests:

```text
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
content-length: 15
Date: <current HTTP date>
Connection: keep-alive
Keep-Alive: timeout=72

{"status":"ok"}
```

Keep a liveness check shallow. If it waits for every dependency, a database or
network outage can cause the platform to restart otherwise healthy application
processes. Applications that need to advertise whether they can receive
traffic commonly expose a separate readiness check for their dependencies.
Quote Vault does not need one while its data remains in memory.

## Control framework-generated log volume

By default, Fastify produces an incoming and a completed record for every
request. Routine probes can dominate the volume: a health check every five
seconds makes 17,280 requests per day. At two records per request, that makes
1,036,800 records in 30 days even when every probe succeeds.

[`LogController` is available starting with Fastify
5.10.0](https://github.com/fastify/fastify/releases/tag/v5.10.0). It controls
Fastify's internal log records. Import it, create a controller that matches the
exact liveness route, and pass the controller to Fastify:

```ts
// server.ts - update the Fastify import
import fastify, { LogController } from 'fastify'

// server.ts - after the logger configuration
const logController = new LogController({
  disableRequestLogging: (request) => {
    return request.method === 'GET' && request.routeOptions.url === '/health'
  }
})

const app = fastify({
  logger,
  logController,
  // Keep the existing Fastify options.
})
```

We use `request.routeOptions.url` because this policy targets the Fastify route
that handled the request. `request.url` is the incoming URL and includes its
query string. For example, if a probe calls
`/health?source=load-balancer`, comparing `request.url === '/health'` would be
false. `request.routeOptions.url` remains `/health`, so the controller still
recognizes the request as a call to the registered health route.

The controller suppresses Fastify's automatic incoming, completed, and error
records for this route. It does not disable an application log written with
`request.log`.

Restart the server, call the liveness endpoint several times, then make an
authenticated quote request:

```bash
curl http://localhost:3000/health
curl 'http://localhost:3000/health?source=load-balancer'
curl http://localhost:3000/quotes \
  -H "Authorization: Bearer user"
```

The successful health probes produce no request records. The quote request
still produces its incoming and completed records with a shared `reqId`.

Subclassing `LogController` can change levels, sampling, fields, or individual
internal records. This is an advanced tool: overriding a method takes full
responsibility for that record. An override that supports conditional
suppression must call `this.isLogDisabled(request)` itself. See the
[`LogController` reference](../Reference/Server.md#logcontroller) before doing
so.

This suppression policy is safe for the current endpoint because it is a
shallow liveness check with a single successful response. If a health endpoint
can report a dependency failure, keep those failures visible through automatic
request logging or an intentional application log.

## Plan monitoring with each deployment

A successful liveness response answers one narrow question. It does not prove
that every dependency works, that requests are fast, or that a new feature
behaves correctly. The deployment platform should monitor the probe result
directly instead of relying on application logs for successful probes.

Before deploying a new feature or API version, decide which signals will show
whether it works in production. Useful signals include request error rates and
latency, resource saturation, and a small number of domain events such as the
`quote created` record. Stable fields for the route, API version, or deployed
release make it possible to compare a rollout with the previous version.

Also decide what should trigger an alert and how to roll back before the change
is deployed. Logs provide evidence for an investigation. Health checks detect
when an individual application instance stops responding, allowing a load
balancer or orchestrator to stop routing traffic to it or restart it. Aggregate
metrics reveal changes in latency, errors, and resource usage across the whole
deployment. These signals complement each other and should not all be derived
from one high-volume log stream.

## Process logs outside request handling

Quote Vault writes structured records to standard output. In a typical
deployment, a collector provided by the platform reads that output, batches the
records, and forwards them to the service used to store and search logs.

An application can also use a [Pino transport](https://github.com/pinojs/pino/blob/main/docs/transports.md)
to transform or transmit its records. Pino recommends running that work in a
worker thread or a separate process so that it does not block request handling.

The service used to store and search logs depends on where the application is
deployed, so Quote Vault does not add a logging vendor in this chapter.

## Summary

Quote Vault now emits a structured business event with its request ID, keeps
machine-readable JSON for collected output, and formats only interactive output
for people. Its public liveness endpoint avoids routine request-log noise. We
also established rules for levels, sensitive data, request IDs, deployment
monitoring, and log volume before the next chapter introduces application
errors.
