# V6 Migration Guide

This guide is intended to help with migration from Fastify v5 to v6.

Before migrating to v6, please ensure that you have fixed all deprecation
warnings from v5. All v5 deprecations have been removed and will no longer
work after upgrading.

## Long Term Support Cycle

Fastify v6 only supports Node.js v24+. If you are using an older version of
Node.js, you will need to upgrade before using Fastify v6.

Fastify v5 is still supported according to the
[Long Term Support][lts-link] schedule. If you are unable to upgrade,
you should consider buying an end-of-life support plan from
[HeroDevs](https://www.herodevs.com/support/fastify-nes).

### Why Node.js v24?

Fastify v6 targets Node.js v24+ because it provides a stable,
high-performance runtime with built-in support for modern JavaScript
features and improved `node:test` APIs that Fastify uses internally.

Node.js v22 reaches End-of-Life in April 2027, so planning an upgrade
is recommended regardless.

## Breaking Changes

### Node.js Minimum Version is Now v24

Fastify v6 drops support for Node.js versions below v24.

If you are running Node.js v18, v20, or v22, you must upgrade to v24
before using Fastify v6.

See [#6904](https://github.com/fastify/fastify/pull/6904) for more details.

---

### `allowErrorHandlerOverride` is Now `false` by Default

In Fastify v5, calling `setErrorHandler` multiple times on the same scope
would silently replace the previous handler and emit a `FSTWRN004` warning.
This behavior was confusing and error-prone.

In v6, `allowErrorHandlerOverride` defaults to `false`. Attempting to call
`setErrorHandler` more than once on the same scope will now **throw an error**
instead of silently overwriting.

```js
// v5 — second call silently replaced the first and emitted a warning
fastify.setErrorHandler(handlerA)
fastify.setErrorHandler(handlerB) // FSTWRN004 warning only
```

```js
// v6 — second call throws
fastify.setErrorHandler(handlerA)
fastify.setErrorHandler(handlerB) // throws FastifyError
```

**How to fix:** Register a single error handler per scope. If you truly need
to override an error handler (e.g. in tests), pass the opt-in flag explicitly:

```js
const fastify = Fastify({ allowErrorHandlerOverride: true })
```

See [#6915](https://github.com/fastify/fastify/pull/6915) for more details.

---

### Removed Deprecations

All deprecation codes introduced during the v5 lifecycle have been removed in
v6. The runtime warnings no longer fire because the deprecated functionality
has been deleted.

#### `FSTDEP022` — Removed

The deprecated behavior associated with `FSTDEP022` has been removed.
This deprecation covered the old `request.routeSchema` shorthand.

Use `request.routeOptions.schema` instead:

```js
// v5 — deprecated
const schema = request.routeSchema

// v6
const schema = request.routeOptions.schema
```

See [#6908](https://github.com/fastify/fastify/pull/6908) for more details.

---

#### `FSTDEP023` — Removed

The deprecated behavior associated with `FSTDEP023` has been removed.

See [#6913](https://github.com/fastify/fastify/pull/6913) for more details.

---

#### `FSTDEP024` — Removed: `requestIdLogLabel` top-level option

The top-level `requestIdLogLabel` option was deprecated in v5 as `FSTDEP024`
and has been fully removed in v6.

```js
// v5 — deprecated
const fastify = Fastify({ requestIdLogLabel: 'reqId' })
```

```js
// v6 — use the genReqId or the logger's redact configuration
const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty'
    }
  }
})
```

See [#6912](https://github.com/fastify/fastify/pull/6912) for more details.

---

#### `FSTDEP025` — Removed

The deprecated behavior associated with `FSTDEP025` has been removed.

See [#6909](https://github.com/fastify/fastify/pull/6909) for more details.

---

### `withResolvers` Ponyfill Removed

Fastify previously included an internal ponyfill for `Promise.withResolvers`
to support older Node.js versions. Because v6 requires Node.js v24+, which
ships `Promise.withResolvers` natively, the ponyfill has been removed.

This is an **internal change** and has no effect on public APIs.

See [#6910](https://github.com/fastify/fastify/pull/6910) for more details.

---

### `ResSerializerReply` TypeScript Type Removed

The `ResSerializerReply` TypeScript type that was deprecated in v5 has been
removed from `fastify.d.ts`.

If you were using `ResSerializerReply` in your TypeScript code, migrate to
the updated reply generics.

See [#6911](https://github.com/fastify/fastify/pull/6911) for more details.

---

## Content-Type Parser: Strict Validation

Fastify v6 applies stricter validation of `Content-Type` headers.

Malformed or unsupported content types that were previously silently ignored
will now return a proper `415 Unsupported Media Type` error.

```js
// Requests with invalid Content-Type now get 415 instead of falling through
```

See [#6925](https://github.com/fastify/fastify/pull/6925) for more details.

---

## Upgrading Step by Step

Follow these steps when migrating an existing application from v5 to v6:

1. **Fix all deprecation warnings in v5 first.** Run your application under v5
   and resolve every `FSTDEP*` warning before upgrading. If you upgrade with
   unresolved deprecations, the removed features will throw errors at runtime.

2. **Upgrade Node.js to v24+.** Fastify v6 will not start on older runtimes.

3. **Upgrade Fastify:**

   ```sh
   npm install fastify@6
   ```

4. **Audit your `setErrorHandler` calls.** If any scope calls `setErrorHandler`
   more than once, consolidate them into a single handler. If you genuinely
   need the override behavior, enable it explicitly:

   ```js
   const fastify = Fastify({ allowErrorHandlerOverride: true })
   ```

5. **Remove uses of `requestIdLogLabel`.** This top-level option no longer
   exists. Update your logger configuration accordingly.

6. **Update TypeScript types.** Remove any references to `ResSerializerReply`
   and ensure your type provider packages are updated to their v6-compatible
   releases.

7. **Run your test suite.** All Fastify v5 tests should pass unmodified on v6
   if you have addressed the points above.

---

## Plugin Compatibility

Fastify v6 introduces a minimum Node.js version of v24. Plugins maintained
by the Fastify team have been updated accordingly. Community plugins may
require separate updates — check each plugin's changelog or open an issue
if you encounter incompatibilities.

---

## Getting Help

- [Fastify Discord](https://discord.com/invite/fastify)
- [GitHub Discussions](https://github.com/fastify/fastify/discussions)
- [Fastify Help Repository](https://github.com/fastify/help)

[lts-link]: https://fastify.dev/docs/latest/Reference/LTS/
