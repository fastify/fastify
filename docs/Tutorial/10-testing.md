# Testing

Launching the application and testing it manually with an HTTP client
works, but it is slow, not very convenient, and does not prevent
regressions. Automated tests let you run a suite of checks in seconds
after every change.

> A regression is an unintended break: something that worked correctly before
stops working after a change elsewhere in the code. A good test suite helps
catch these problems early.

## HTTP injection and `light-my-request`

Fastify exposes `app.inject()` for testing routes without starting a
real HTTP server.

Under the hood, it uses the
[`light-my-request`](https://github.com/fastify/light-my-request) library.
This runs the full Fastify lifecycle (plugins, hooks, validation,
serialization, error handlers) and can run entirely in-memory.
You may still use a real database if needed, but no network is required.

We will use `inject()` to test our routes and error handlers.

## Test runner and coverage

Node has a [built-in test runner](https://nodejs.org/api/test.html)
(`node:test`) that we will use through
[`borp`](https://github.com/mcollina/borp?tab=readme-ov-file), which
also supports coverage via [`c8`](https://www.npmjs.com/package/c8).

Install borp as a development dependency:

```bash
npm i -D borp
```

Add this script in `package.json`:

```json
{
  "scripts": {
    "test": "borp --coverage --check-coverage"
  }
}
```

Coverage tells you which lines, branches, and functions were executed.
When part of a branch is never reached, coverage will show it. This
helps identify untested behavior.

Coverage is a useful metric, but pursuing very high coverage should be
done with care.
If you must mock deep internals (private functions, module-scoped
variables) only to execute unreachable lines, this usually indicates a
design issue, not a testing one.
Prefer testing through the public API (routes, exported functions)
rather than forcing tests to reach code paths that should not be
accessed directly.

## Creating an application factory

To test the application effectively, we separate building the Fastify
instance (plugins, routes, schemas, error handlers) from launching a
server. We introduce a factory `createApp()` that returns a configured
Fastify instance. This instance can be used by both HTTP server startup
and tests.

### app.js

```js
import fastify from "fastify";
import { idParam } from "./schemas.js";
import configureErrorHandlers from "./error-handlers.js";
import { dbPlugin } from "./plugins/db.js";
import { quotesRepositoryPlugin } from "./plugins/quotes-repo.js";
import { protectedRoutes } from "./routes/protected.js";

// This factory also allows to customize
// configuration.
export function createApp(options = {}) {
  const app = fastify({
    logger: options.logger ?? false,
    ajv: {
      customOptions: {
        allErrors: false,
        coerceTypes: "array",
        removeAdditional: "all",
      },
    },
  });

  app.register(dbPlugin);
  app.register(quotesRepositoryPlugin);

  app.addSchema(idParam);

  app.register(protectedRoutes);

  configureErrorHandlers(app);

  app.get("/throw", async function () {
    throw new Error("💥 Kaboom!");
  });

  app.get("/not-protected", async function () {
    return { ok: true };
  });

  return app;
}
```

### server.js

```js
import closeWithGrace from "close-with-grace";
import { createApp } from "./app.js";

const app = createApp({ logger: true });

closeWithGrace(async ({ err }) => {
  if (err != null) {
    app.log.error(err);
  }
  await app.close();
});

try {
  await app.listen({ port: 3000 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

Tests can now import `createApp()` and call `inject()` directly, without
running `listen()`.

## Writing tests for `/quotes`

Create a file `test/quotes.test.js`.

We test a few representative cases, and you will extend the suite as an
exercise:

* GET /quotes: authentication and response.
* POST /quotes: authentication, validation, sanitized output.
* Global error handler.

Each test creates a fresh Fastify instance and closes it afterward.

### Testing GET /quotes

```js
// test/quotes.test.js
import { test, describe } from "node:test";
import { createApp } from "../app.js";

describe("GET /quotes", () => {
  test("fails without Authorization header", async (t) => {
    const app = createApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/quotes",
    });

    t.assert.equal(res.statusCode, 401);
    t.assert.deepStrictEqual(res.json(), {
      message: "Missing Authorization",
    });

    await app.close();
  });

  test("returns an empty list for authenticated users", async (t) => {
    const app = createApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/quotes",
      headers: { authorization: "Bearer user" },
    });

    t.assert.equal(res.statusCode, 200);
    t.assert.deepStrictEqual(res.json(), []);

    await app.close();
  });
});
```

### Testing POST /quotes

```js
describe("POST /quotes", () => {
  test("fails without Authorization", async (t) => {
    const app = createApp({ logger: false });

    const res = await app.inject({
      method: "POST",
      url: "/quotes",
      payload: { text: "X" },
    });

    t.assert.equal(res.statusCode, 401);
    t.assert.deepStrictEqual(res.json(), {
      message: "Missing Authorization",
    });

    await app.close();
  });

  test("fails with invalid payload", async (t) => {
    const app = createApp({ logger: false });

    const res = await app.inject({
      method: "POST",
      url: "/quotes",
      headers: {
        authorization: "Bearer user",
        "content-type": "application/json",
      },
      payload: { wrong: "field" },
    });

    t.assert.equal(res.statusCode, 400);
    t.assert.equal(typeof res.json().message, "string");

    await app.close();
  });

  test("creates a quote and returns sanitized output", async (t) => {
    const app = createApp({ logger: false });

    const res = await app.inject({
      method: "POST",
      url: "/quotes",
      headers: {
        authorization: "Bearer user",
        "content-type": "application/json",
      },
      payload: { text: "New quote" },
    });

    t.assert.equal(res.statusCode, 201);

    const body = res.json();
    t.assert.deepStrictEqual(body, {
      id: body.id,
      text: "New quote",
    });

    await app.close();
  });
});
```

### Testing the global error handler

This checks that internal errors are logged and that the user sees a
generic message.
We use `t.mock.method` to capture calls to `app.log.error`.

```js
describe("global error handler", () => {
  test("logs and hides internal errors", async (t) => {
    const app = createApp({ logger: "silent" });

    // Native node test runner utility
    // See: https://nodejs.org/api/test.html#mockmethodobject-methodname-implementation-options
    const { mock: errorMock } = t.mock.method(app.log, "error");

    const res = await app.inject({
      method: "GET",
      url: "/throw",
    });

    // Inspect response
    t.assert.equal(res.statusCode, 500);
    t.assert.deepStrictEqual(res.json(), {
      message: "Internal Server Error",
    });

    t.assert.equal(errorMock.calls.length, 1);

    // Inspect logger call arguments
    const call = errorMock.calls[0];
    t.assert.equal(call.arguments.length, 2);

    const [logObj, logMsg] = call.arguments;

    t.assert.equal(typeof logMsg, "string");
    t.assert.ok(logMsg.includes("Unhandled error occurred"));

    t.assert.ok(logObj.err instanceof Error);
    t.assert.equal(logObj.request.url, "/throw");
    t.assert.equal(logObj.request.method, "GET");

    await app.close();
  });
});
```

## Running tests and reviewing coverage

Run tests:

```bash
npm test
```

Use the coverage report to find untested paths (404 cases, admin-only
deletes, validation branches).

## Challenge

Extend the test suite to cover:

* GET /quotes/:id (found and not found)
* PUT /quotes/:id (update and not found)
* DELETE /quotes/:id (403 for user, 204 for admin, 404 when missing)
* The 404 handler

A broader suite increases confidence when evolving the application.
