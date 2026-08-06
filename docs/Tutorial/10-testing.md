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

### app.ts

```ts
import fastify from "fastify";
import configureErrorHandlers from "./error-handlers.ts";
import { dbPlugin } from "./plugins/db.ts";
import { quotesRepositoryPlugin } from "./plugins/quotes-repo.ts";
import { protectedRoutes } from "./routes/protected.ts";
import type { FastifyServerOptions } from "fastify";

export interface AppOptions {
  logger?: FastifyServerOptions["logger"];
}

// This factory also allows to customize
// configuration.
export function createApp(options: AppOptions = {}) {
  const app = fastify({
    logger: options.logger,
    forceCloseConnections: false,
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

Fastify already disables logging when `logger` is `undefined`. The factory only
forwards an explicit logger choice; `server.ts` enables logging with `true`,
while the test helper uses `false` unless a test supplies another value.

### server.ts

```ts
import closeWithGrace from "close-with-grace";
import { createApp } from "./app.ts";

const app = createApp({ logger: true });

closeWithGrace(
  { delay: 15_000 },
  async function ({ err }) {
    if (err != null) {
      app.log.error(err);
    }
    await app.close();
  }
);

try {
  await app.listen({ host: "0.0.0.0", port: 3000 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

### test/app.ts

For tests, it is convenient to expose a small helper that creates the app
with quiet defaults. That avoids repeating `createApp({ logger: false })`
in every test while still allowing overrides when needed.

```ts
// test/app.ts
import { createApp } from "../app.ts";
import type { AppOptions } from "../app.ts";

export function createTestApp(options: AppOptions = {}) {
  return createApp({
    logger: false,
    ...options,
  });
}
```

Tests can now import `createTestApp()` and call `inject()` directly, without
running `listen()`.


## Organize tests by responsibility

Reaching 100% coverage requires us to exercise success, failure, and lifecycle
branches. Those checks should still be grouped by the behavior they describe,
rather than collected in one coverage-only suite.

We will create four test files:

* `test/auth.test.ts` covers the teaching authentication hook.
* `test/quotes.test.ts` covers validation, serialization, and quote CRUD.
* `test/app.test.ts` covers public routes and global error handling.
* `test/plugins/db.test.ts` covers the database plugin lifecycle.

Each test creates a fresh Fastify instance and closes it afterward.

### `test/auth.test.ts`

Authentication is inherited by the protected quote routes. Test both ways in
which that hook rejects a request:

```ts
import { describe, test, type TestContext } from "node:test";
import { createTestApp } from "./app.ts";

describe("authentication", () => {
  test("rejects a missing Authorization header", async (t: TestContext) => {
    const app = createTestApp();
    t.after(() => app.close());

    const res = await app.inject("/quotes");

    t.assert.equal(res.statusCode, 401);
    t.assert.deepStrictEqual(res.json(), {
      message: "Missing Authorization",
    });
  });

  test("rejects an invalid token", async (t: TestContext) => {
    const app = createTestApp();
    t.after(() => app.close());

    const res = await app.inject({
      method: "GET",
      url: "/quotes",
      headers: { authorization: "Bearer hacker" },
    });

    t.assert.equal(res.statusCode, 401);
    t.assert.deepStrictEqual(res.json(), {
      message: "Invalid token",
    });
  });
});
```

The valid user and administrator branches are exercised by the quote tests
below.

### `test/quotes.test.ts`

Create a helper for the repeated quote setup, then cover every quote route:

```ts
import { describe, test, type TestContext } from "node:test";
import { createTestApp } from "./app.ts";
import type { FastifyInstance } from "fastify";

const userHeaders = { authorization: "Bearer user" };
const adminHeaders = { authorization: "Bearer admin" };

async function createQuote(
  app: FastifyInstance,
  text = "New quote"
) {
  return app.inject({
    method: "POST",
    url: "/quotes",
    headers: userHeaders,
    payload: { text },
  });
}

describe("quote routes", () => {
  test("lists quotes with the default and an explicit limit", async (t: TestContext) => {
    const app = createTestApp();
    t.after(() => app.close());

    const empty = await app.inject({
      method: "GET",
      url: "/quotes",
      headers: userHeaders,
    });

    await createQuote(app, "First");
    await createQuote(app, "Second");

    const limited = await app.inject({
      method: "GET",
      url: "/quotes?limit=1",
      headers: userHeaders,
    });

    t.assert.equal(empty.statusCode, 200);
    t.assert.deepStrictEqual(empty.json(), []);
    t.assert.deepStrictEqual(limited.json(), [
      { id: 1, text: "First" },
    ]);
  });

  test("gets an existing quote and reports invalid or missing IDs", async (t: TestContext) => {
    const app = createTestApp();
    t.after(() => app.close());
    await createQuote(app);

    const found = await app.inject({
      method: "GET",
      url: "/quotes/1",
      headers: userHeaders,
    });
    const missing = await app.inject({
      method: "GET",
      url: "/quotes/2",
      headers: userHeaders,
    });
    const invalid = await app.inject({
      method: "GET",
      url: "/quotes/not-an-id",
      headers: userHeaders,
    });

    t.assert.equal(found.statusCode, 200);
    t.assert.deepStrictEqual(found.json(), {
      id: 1,
      text: "New quote",
    });
    t.assert.equal(missing.statusCode, 404);
    t.assert.equal(invalid.statusCode, 400);
  });

  test("validates and serializes created quotes", async (t: TestContext) => {
    const app = createTestApp();
    t.after(() => app.close());

    const invalid = await app.inject({
      method: "POST",
      url: "/quotes",
      headers: userHeaders,
      payload: { wrong: "field" },
    });
    const created = await createQuote(app);

    t.assert.equal(invalid.statusCode, 400);
    t.assert.equal(created.statusCode, 201);
    t.assert.deepStrictEqual(created.json(), {
      id: 1,
      text: "New quote",
    });
  });

  test("updates a quote and reports a missing one", async (t: TestContext) => {
    const app = createTestApp();
    t.after(() => app.close());
    await createQuote(app);

    const updated = await app.inject({
      method: "PUT",
      url: "/quotes/1",
      headers: userHeaders,
      payload: { text: "Updated quote" },
    });
    const missing = await app.inject({
      method: "PUT",
      url: "/quotes/2",
      headers: userHeaders,
      payload: { text: "Missing quote" },
    });

    t.assert.equal(updated.statusCode, 200);
    t.assert.deepStrictEqual(updated.json(), {
      id: 1,
      text: "Updated quote",
    });
    t.assert.equal(missing.statusCode, 404);
  });

  test("allows only administrators to delete quotes", async (t: TestContext) => {
    const app = createTestApp();
    t.after(() => app.close());
    await createQuote(app);

    const forbidden = await app.inject({
      method: "DELETE",
      url: "/quotes/1",
      headers: userHeaders,
    });
    const deleted = await app.inject({
      method: "DELETE",
      url: "/quotes/1",
      headers: adminHeaders,
    });
    const missing = await app.inject({
      method: "DELETE",
      url: "/quotes/1",
      headers: adminHeaders,
    });

    t.assert.equal(forbidden.statusCode, 403);
    t.assert.equal(deleted.statusCode, 204);
    t.assert.equal(missing.statusCode, 404);
  });
});
```

The create assertion also proves response serialization: the route returns a
demonstration `secret` property internally, but the response schema removes it.

### `test/app.test.ts`

Application-level tests cover routes outside the protected subtree and the
global handlers:

```ts
import { describe, test, type TestContext } from "node:test";
import { createApp } from "../app.ts";
import { createTestApp } from "./app.ts";

describe("application behavior", () => {
  test("keeps public and not-found routes outside authentication", async (t: TestContext) => {
    const app = createTestApp();
    t.after(() => app.close());

    const publicRoute = await app.inject("/not-protected");
    const missing = await app.inject("/does-not-exist");

    t.assert.equal(publicRoute.statusCode, 200);
    t.assert.deepStrictEqual(publicRoute.json(), { ok: true });
    t.assert.equal(missing.statusCode, 404);
    t.assert.deepStrictEqual(missing.json(), {
      message: "This is not the route you are looking for!",
    });
  });

  test("builds the application when options are omitted", async (t: TestContext) => {
    const app = createApp();
    t.after(() => app.close());

    const res = await app.inject("/not-protected");
    t.assert.equal(res.statusCode, 200);
  });

  test("logs and hides internal errors", async (t: TestContext) => {
    const app = createTestApp({ logger: "silent" });
    t.after(() => app.close());

    // Native Node.js test runner utility:
    // https://nodejs.org/api/test.html#mockmethodobject-methodname-implementation-options
    const { mock: errorMock } = t.mock.method(app.log, "error");

    const res = await app.inject("/throw");

    t.assert.equal(res.statusCode, 500);
    t.assert.deepStrictEqual(res.json(), {
      message: "Internal Server Error",
    });
    t.assert.equal(errorMock.calls.length, 1);

    const [logObject, logMessage] =
      errorMock.calls[0].arguments;

    t.assert.equal(logMessage, "Unhandled error occurred");
    t.assert.ok(logObject.err instanceof Error);
    t.assert.equal(logObject.request.url, "/throw");
    t.assert.equal(logObject.request.method, "GET");
  });
});
```

### `test/plugins/db.test.ts`

The database plugin owns its resource, so its shutdown behavior belongs in a
plugin test:

```ts
import { test, type TestContext } from "node:test";
import { createTestApp } from "../app.ts";

test("closes the database resource", async (t: TestContext) => {
  const app = createTestApp();
  t.after(() => app.close());
  await app.ready();
  const database = app.db;

  t.assert.equal(database.started, true);
  t.assert.deepStrictEqual(database.getAll("quotes"), []);

  await app.close();
  t.assert.equal(database.started, false);
});
```

This direct call to `getAll()` also exercises the database branch where no
limit is supplied. The route tests always provide a default numeric limit.

## Running tests and reviewing coverage

Run:

```bash
npm test
```

The suite must report 100% for statements, branches, functions, and lines
before continuing. Coverage confirms that each code path ran; the file
boundaries above keep each assertion attached to the concern it describes.

## Tests and shared state in later chapters

The application is still in memory at this point, so every test app owns its
state. Later chapters replace that storage with local PostgreSQL and Redis
services. Their test fixtures deliberately clear and replace data to keep each
test deterministic.

Treat those test services as disposable. Running `npm test` can remove records
created during manual checks and invalidate browser sessions. If manual
behavior becomes inconsistent after a test run, restore the tutorial fixtures
with the latest database seeding instructions and log in again. Never point
the test configuration at a database or Redis instance containing data you
need to preserve.
