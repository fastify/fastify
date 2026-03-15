<h1 align="center">Fastify</h1>

# Migration Guide: from declaration merging to registration-scoped typing

This guide explains how to migrate TypeScript code from global/ambient
`declare module 'fastify'` assumptions to Fastify's registration-scoped typing
model for decorators.

It is written for:

- **application maintainers** using Fastify in production services;
- **plugin maintainers** publishing Fastify plugins.

> This registration-scoped decorator typing approach is part of the Fastify 6
> TypeScript model.

## What changed

In the declaration-merging model, decorators often appeared globally in types,
even outside the scope where they were registered.

In the registration-scoped model:

- `decorate()`, `decorateRequest()`, and `decorateReply()` widen the current
  instance type;
- `register()` carries plugin effects through typed registration flow;
- decorator visibility follows encapsulation and registration boundaries.

Runtime behavior is unchanged. The change is in type transport and type
visibility.

---

## Migration checklist (quick)

1. Track where decorators are actually registered.
2. Keep and use the registered instance value in typed code.
3. Stop relying on type-only side-effect imports to expose decorators globally.
4. Refactor tests to use local typed helpers instead of global ambient test
   augmentations.
5. Validate with full lint/build/typecheck/tests and explicit success output.

---

## Application migration

## 1) Keep the registered instance in scope

### Before

```ts
const app = fastify()
app.register(fastifyStatic, { root: '/public' })

app.get('/', (request, reply) => {
  reply.sendFile('index.html')
})
```

### After

```ts
const app = fastify().register(fastifyStatic, { root: '/public' })

app.get('/', (request, reply) => {
  reply.sendFile('index.html')
})
```

The runtime object is the same, but the typed registered value carries decorator
availability.

## 2) Make registration order explicit in typed code

If route/hook definitions are attached before type-visible registration,
TypeScript should reject decorator usage. Move route definitions into the proper
scope or use the typed registered value.

## 3) Respect encapsulation boundaries

If a decorator is registered in a child plugin, do not assume it exists on
parent/sibling branches.

## 4) Avoid type-only plugin imports for decorator visibility

Do not use `import '@fastify/some-plugin'` as a typing shortcut for unrelated
instances. Register plugins on the instance path where decorators are used.

## 5) Handle dynamic decorator names explicitly

For namespaced/renamed decorators, inference may not be fully automatic.
Introduce local helper types or explicit aliases where names are configured at
runtime.

---

## Plugin migration

## 1) Type plugin effects explicitly

Plugin types should encode what is added to:

- instance decorators,
- request decorators,
- reply decorators.

Avoid relying only on ambient merging for public typing.

## 2) Keep runtime logic stable, migrate type transport

Most plugin ports are primarily typing refactors. Preserve runtime behavior,
move typing to registration-scoped contracts.

## 3) Make default paths fully inferred

For plugins with configurable decorator names, keep default names strongly
typed; provide helper types for advanced renamed paths.

## 4) Derive override signatures from base contracts

When subclassing strategy-like abstractions, derive parameter types from the
base signature, e.g. `Parameters<Base['method']>[0]`, to avoid variance and
augmentation mismatches.

## 5) Refactor tests away from ambient assumptions

If tests assumed globally available decorators, migrate to local test helpers
that narrow request/reply types at usage points.

This is usually the longest part of migration work.

---

## Test migration patterns that work

## Pattern A: local request/reply adapters in tests

Use helper functions in test utilities that narrow to the expected decorated
shape where needed, rather than globally augmenting all test types.

## Pattern B: runtime guard + typed return helper

In tests where setup is indirect, use small runtime checks (`if (!('flash' in
reply)) throw`) and return a typed helper object. This keeps type assumptions
local and explicit.

## Pattern C: avoid final-state crutches

Temporary migration aids can unblock early work, but final validation should not
require:

- test-only ambient compat bridges;
- `skipLibCheck` as a migration bypass.

---

## Common failures and fixes

| Error | Cause | Fix |
|---|---|---|
| `Property 'x' does not exist on request/reply` | Decorator used outside registered type scope | Use typed registered instance or move code into correct encapsulation scope |
| Override method is not assignable | Override signature does not match base contract | Derive signature from base method parameters |
| Works at runtime, fails in TS | Registration order not reflected in typing flow | Reorder definitions or retain typed registration value |
| Tests only pass with compat `.d.ts` | Hidden global assumptions in tests | Replace with local typed test helpers |

---

## Validation gate

A migration is considered complete when all are true:

- registration-scoped typing is used for decorator visibility;
- docs are updated for typing behavior changes;
- no global compat test augmentation is required;
- no `skipLibCheck` migration bypass is required;
- lint/build/typecheck/tests pass with explicit success indicators.

---

## Related docs

- [TypeScript reference](../Reference/TypeScript.md)
- [Plugins guide](./Plugins-Guide.md)
- [Write Plugin](./Write-Plugin.md)
- [Encapsulation reference](../Reference/Encapsulation.md)
