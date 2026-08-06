# Authorization

Quote Vault can now establish who is making a request. It still needs to decide
what that user may do.

In this chapter, we will:

* distinguish authentication from authorization,
* create a reusable role check,
* and allow only administrators to delete quotes.

## Authentication and authorization

**Authentication** establishes identity. A valid session tells Quote Vault
which user is making the request.

**Authorization** checks permission after identity is known. Every logged-in
user may work with quotes, but only a user with the `admin` role may delete
one.

The corresponding HTTP responses are:

* `401 Unauthorized` when valid authentication is missing,
* `403 Forbidden` when an authenticated user lacks permission.

The application authentication hook runs before route-level authorization, so
authorization can safely inspect `request.session.user.roles`.

## Define the forbidden response

Create `plugins/app/authorization/schemas.ts`:

```ts
import { Type } from 'typebox'

export const forbiddenResponse = Type.Object(
  {
    message: Type.String()
  },
  { additionalProperties: false }
)
```

The quote response schema will reuse this object for status `403`.

## Build the authorization service

Create `plugins/app/authorization/authorization.service.ts`:

```ts
import fp from 'fastify-plugin'
import type {
  FastifyReply,
  FastifyRequest,
  onRequestHookHandler
} from 'fastify'

type Role = string

declare module 'fastify' {
  interface FastifyInstance {
    requireRoles: (...allowedRoles: Role[]) => onRequestHookHandler
  }
}

// This service is shared so other domains can opt in to role checks.
// Authorization remains route-specific.
export const authorizationServicePlugin = fp(
  async function authorizationServicePlugin (app) {
    app.decorate('requireRoles', function requireRoles (
      ...allowedRoles: Role[]
    ) {
      return async function enforceRequiredRoles (
        request: FastifyRequest,
        reply: FastifyReply
      ) {
        const authorized = allowedRoles.some((role) => {
          return request.session.user?.roles.includes(role)
        })

        if (!authorized) {
          return reply.code(403).send({
            message: 'You are not authorized to access this resource.'
          })
        }
      }
    })
  },
  {
    name: 'authorization-service',
    dependencies: ['authentication-hook']
  }
)
```

`requireRoles` is exposed to route domains by the authorization service.
Calling `app.requireRoles('admin')` returns a request handler for that policy,
which this tutorial uses with `onRequest`. Passing several roles would allow
any one of them.

The role check only reads the user already loaded from the session. Running it
in `onRequest` rejects a forbidden request before body parsing and validation.
The application authentication `onRequest` hook runs first, so authorization
can safely inspect `request.session.user`.

The dependency records an important assumption: authorization only runs after
authentication has made a trusted user available.

Expose the service through the authorization domain entry point.

### `plugins/app/authorization/authorization.plugin.ts`

```ts
import fp from 'fastify-plugin'
import {
  authorizationServicePlugin
} from './authorization.service.ts'

export const authorizationPlugin = fp(
  async function authorizationPlugin (app) {
    app.register(authorizationServicePlugin)
  },
  {
    name: 'authorization',
    // Shared so route domains can opt in with `app.requireRoles(...)`.
    dependencies: ['authentication']
  }
)
```

Like authentication, authorization is intentionally shared with the quote
domain registered after it.

## Protect quote deletion

Import `forbiddenResponse` in `plugins/app/quotes/schemas.ts` and add it to the
delete responses:

```ts
import { Type } from 'typebox'
import { forbiddenResponse } from '../authorization/schemas.ts'

export const deleteQuoteResponse = {
  204: Type.Null(),
  403: forbiddenResponse,
  404: quoteError
}
```

Then add the role hook to the existing delete route:

```ts
app.delete(
  '/quotes/:id',
  {
    schema: {
      params: idParam,
      response: deleteQuoteResponse
    },
    // New for this chapter: deleting a quote requires the administrator role.
    onRequest: app.requireRoles('admin')
  },
  async function (request, reply) {
    const deleted = await this.quotesRepository.remove(request.params.id)
    if (!deleted) {
      reply.code(404)
      return { message: 'Quote not found' }
    }
    return reply.code(204).send(null)
  }
)
```

Update the quote plugin metadata too:

```ts
{
  name: 'quotes-routes',
  encapsulate: true,
  dependencies: [
    'authentication-hook',
    'authorization-service',
    'quotes-repository'
  ],
  decorators: {
    fastify: ['requireRoles', 'quotesRepository']
  }
}
```

The quote domain entry point now records the new domain-level dependency:

```ts
export const quotesPlugin = fp(
  async function quotesPlugin (app) {
    app.register(quotesRepositoryPlugin)
    app.register(quotesRoutesPlugin)
  },
  {
    name: 'quotes',
    encapsulate: true,
    dependencies: ['authentication', 'authorization']
  }
)
```

Authentication remains an `onRequest` hook for every quote route.
Authorization adds another `onRequest` hook only on the operation that needs
the stronger policy.

## Register authorization

Register the authorization domain before the quote domain that consumes its
decorator:

```ts
app.register(async function application (app) {
  app.register(usersPlugin)
  app.register(passwordsPlugin)
  app.register(authenticationPlugin)
  app.register(registrationPlugin)
  // New for this chapter: reusable role-based policies.
  app.register(authorizationPlugin)
  app.register(quotesPlugin)
})
```

## Verify permissions

Log in as the regular tutorial user and attempt a deletion. The first command's
`-c cookies.txt` creates or replaces the cookie jar. The second command uses
`-b cookies.txt` to send that saved session cookie:

```bash
curl -i \
  -c cookies.txt \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"User-password1!"}' \
  http://127.0.0.1:3000/login

curl -i \
  -b cookies.txt \
  -X DELETE \
  http://127.0.0.1:3000/quotes/1
```

The response is `403`. Log in as `admin@example.com` with
`Admin-password1!` and repeat the deletion to receive `204` when the quote
exists. Remove the local cookie jar after the checks:

```bash
rm cookies.txt
```

Tests should prove all three boundaries:

* no session receives `401`,
* an authenticated regular user receives `403`,
* and an authenticated administrator can delete the quote.

Update the existing forbidden assertion in
`test/plugins/app/quotes/quotes.test.ts`:

```ts
t.assert.deepStrictEqual(forbidden.json(), {
  message: 'You are not authorized to access this resource.'
})
```

Run the suite:

```bash
npm test
```

## Summary

Quote Vault now separates identity from permission. Authentication protects
the complete quote domain, while the authorization service provides a reusable
role policy for administrator-only operations.

The next chapter will add shared rate limits for both public and authenticated
requests.
