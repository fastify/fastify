# Errors

Currently, we rely entirely on Fastify’s defaults when things go wrong.

This is convenient for development, but in production we need more control:

* Customize **500 errors** without leaking internal details to the client.
* Provide user-friendly messages for **validation errors**.
* Centralize error logging and monitoring.
* Control the response for **404 not found** requests.

Fastify provides dedicated APIs for this:

* `setErrorHandler` – for all unhandled errors in the lifecycle.
* `setNotFoundHandler` – for requests to unknown routes.

## Implementation

We’ll centralize error handling in a new file, `error-handlers.ts`.

```ts
// error-handlers.ts
import type { FastifyError, FastifyInstance } from "fastify";

export default function configureErrorHandlers(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError, request, reply) => {
    const statusCode = err.statusCode ?? 500;

    if (statusCode >= 500) {
      request.log.error({ err }, "request failed");
    } else {
      request.log.info({ err }, "request rejected");
    }

    const message = statusCode >= 500
      ? "Internal Server Error"
      : err.message;

    reply.code(statusCode);

    return { message };
  });

  app.setNotFoundHandler((request, reply) => {
    request.log.warn("resource not found");

    reply.code(404);

    return { message: "This is not the route you are looking for!" };
  });
}
```

The request logger keeps the request ID on each application log. Fastify's
automatic incoming-request record already contains the serialized request, so
we do not repeat the method, URL, query, or parameters here.

Expected client errors, including validation failures, use the `info` level.
Unexpected server errors use `error`, with the original error under Pino's
structured `err` field. Unknown routes use `warn` because they can reveal a
broken link or a client calling an outdated endpoint.

Registering a custom error handler replaces Fastify's default error handler,
including its error log. Logging once inside our handler therefore avoids a
duplicate error record. A custom not-found handler similarly replaces
Fastify's default not-found response and log.

## Using the error handlers

Register the handlers in `server.ts`:

```ts
// server.ts
import configureErrorHandlers from "./error-handlers.ts";

// After hooks and routes
configureErrorHandlers(app);
```

## Error Scenario

To confirm our setup works, let’s add a route that deliberately fails:

```ts
app.get("/throw", async function () {
  throw new Error("💥 Kaboom!");
});
```

## Testing Error Handlers

Here are a few requests to try out:

* **Trigger 500 error**:

```bash
curl -i http://localhost:3000/throw \
  -H "Authorization: Bearer admin"
```

Expected:

```
HTTP/1.1 500 Internal Server Error
{ "message": "Internal Server Error" }
```

The error log contains these stable fields:

```json
{
  "level": 50,
  "reqId": "req-1",
  "err": {
    "type": "Error",
    "message": "💥 Kaboom!",
    "stack": "..."
  },
  "msg": "request failed"
}
```

The changing process fields and request ID will differ, but the `error` level
(`50`), `reqId`, structured `err`, and stable `msg` fields remain consistent.

* **Unknown route**:

```bash
curl -i http://localhost:3000/does-not-exist \
  -H "Authorization: Bearer admin"
```

Expected:

```
HTTP/1.1 404 Not Found
{ "message": "This is not the route you are looking for!" }
```

* **Validation error**:

```bash
curl -i -X POST http://localhost:3000/quotes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin" \
  -d '{}'
```

Expected:

```
HTTP/1.1 400 Bad Request
{ "message": "body must have required property 'text'" }
```

This expected client error is logged at `info` with the message
`request rejected`, not at `error`.

* **Matched-route resource miss**:

```bash
curl -i http://localhost:3000/quotes/999 \
  -H "Authorization: Bearer admin"
```

Expected:

```
HTTP/1.1 404 Not Found
{ "message": "Quote not found" }
```

The request matches `/quotes/:id`, whose route handler sets a 404 response
directly when the quote does not exist. It therefore does not invoke the error
or not-found handler. Fastify's automatic request records still capture this
expected application outcome at `info`. In contrast, the unknown route above
invokes the not-found handler and logs `resource not found` at `warn`.

## Fastify error codes

Internally, Fastify defines its own error codes
(e.g. `FST_ERR_BAD_STATUS_CODE`, `FST_ERR_DEC_MISSING_DEPENDENCY`).
They are all listed in the `fastify.errorCodes` object.

Example of usage:

```ts
import { errorCodes } from "fastify";

app.setErrorHandler((err, request, reply) => {
  if (err instanceof errorCodes.FST_ERR_BAD_STATUS_CODE) {
    request.log.error({ err }, "invalid status code sent");
    return reply.code(500).send({ message: "Internal Server Error" });
  }

  // fallback to normal behavior
  const statusCode = err.statusCode ?? 500;
  const message = statusCode >= 500 ? "Internal Server Error" : err.message;
  return reply.code(statusCode).send({ message });
});
```

### The `@fastify/error` package

The Fastify team also maintains
[`@fastify/error`](https://github.com/fastify/fastify-error).

This package makes it easy to define **structured errors** with a
code, message, and optional status code. The main advantage
is **consistency**: instead of throwing plain `Error`
objects, you define reusable error types with clear codes.

That way:

* Your global error handler can reliably distinguish between different error scenarios.
* Other systems or services can consume your API and handle errors predictably.
* Web browsers and mobile apps can implement smarter UX by reacting to
  specific error codes.
