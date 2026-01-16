# Errors

Currently, we rely entirely on Fastify’s defaults when things go wrong.

This is convenient for development, but in production we need more control:
* Customize **500 errors** without leaking stack traces to the client.
* Provide user-friendly messages for **validation errors**.
* Centralize error logging and monitoring.
* Control the response for **404 not found** requests.

Fastify provides dedicated APIs for this:

* `setErrorHandler` – for all unhandled errors in the lifecycle.
* `setNotFoundHandler` – for requests to unknown routes.

## Implementation

We’ll centralize error handling in a new file, `handle-errors.js`.

```js
// handle-errors.js
export default function configureErrorHandlers(app) {
  app.setErrorHandler((err, request, reply) => {
    // [1] 500 errors are logged in detail
    app.log.error(
      {
        err,
        request: {
          method: request.method,
          url: request.url,
          query: request.query,
          params: request.params,
        },
      },
      "Unhandled error occurred"
    );

    const statusCode = err.statusCode ?? 500;

    let message = "Internal Server Error";
    // [2] but never revealed to users.
    if (statusCode < 500) {
      message = err.message;
    }

    reply.code(statusCode);

    return { message };
  });

  app.setNotFoundHandler((request, reply) => {
    request.log.warn(
      {
        request: {
          method: request.method,
          url: request.url,
          query: request.query,
          params: request.params,
        },
      },
      "Resource not found"
    );

    reply.code(404);

    return { message: "This is not the route you are looking for!" };
  });
}
```

## Using the error handlers

Register the handlers in `server.js`:

```js
// server.js
import configureErrorHandlers from "./handle-errors.js";

// after hooks and routes
configureErrorHandlers(app);
```

## Error Scenario

To confirm our setup works, let’s add a route that deliberately fails:

```js
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

Logs will contain:

```
Unhandled error occurred err=... request={method:"GET", url:"/throw"} 
```

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

## Fastify error codes

Internally, Fastify defines its own error codes
(e.g. `FST_ERR_BAD_STATUS_CODE`, `FST_ERR_DEC_MISSING_DEPENDENCY`).
They are all listed in the `fastify.errorCodes` object.

Example of usage:

```js
import { errorCodes } from "fastify";

app.setErrorHandler((err, request, reply) => {
  if (err instanceof errorCodes.FST_ERR_BAD_STATUS_CODE) {
    app.log.error("Invalid status code sent:", err);
    reply.code(500).send({ message: "Internal Server Error" });
    return;
  }

  // fallback to normal behavior
  reply.code(err.statusCode ?? 500).send({ message: err.message });
});
```

### The `fastify-error` package

The Fastify team also maintains [fastify-error](https://github.com/fastify/fastify-error).

This package makes it easy to define **structured errors** with a 
code, message, and optional status code. The main advantage 
is **consistency**: instead of throwing plain `Error` 
objects, you define reusable error types with clear codes.

That way:

* Your global error handler can reliably distinguish between different error scenarios.
* Other systems or services can consume your API and handle errors predictably.
* Client Browsers and mobile apps can implement smarter UX by reacting to 
  specific error codes.
