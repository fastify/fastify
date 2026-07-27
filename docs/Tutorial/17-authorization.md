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

The authentication hook runs first for the quote domain, so authorization can
safely inspect `request.session.user.roles`.

## Define the forbidden response

Create `plugins/app/authorization/schemas.js`:

```js
export const forbiddenResponse = {
  type: 'object',
  additionalProperties: false,
  required: ['message'],
  properties: {
    message: { type: 'string' }
  }
}
```

The quote response schema will reuse this object for status `403`.

## Build authorization hooks

Create `plugins/app/authorization/authorization.hook-builder.js`:

```js
import fp from 'fastify-plugin'

// This decorator is shared so other domains can opt in to role checks. No
// lifecycle hook is installed globally; authorization remains route-specific.
export const authorizationHookBuilderPlugin = fp(
  async function authorizationHookBuilderPlugin (app) {
    app.decorate('authorize', function buildAuthorizationHook (...allowedRoles) {
      return async function authorizationHook (request, reply) {
        const authorized = allowedRoles.some((role) => {
          return request.session.user.roles.includes(role)
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
    name: 'authorization-hook-builder',
    dependencies: ['authentication-hooks']
  }
)
```

`authorize` is a hook builder. Calling `app.authorize('admin')` creates an
`onRequest` hook for that policy. Passing several roles would allow any one of
them.

The role check only reads the user already loaded from the session. Running it
in `onRequest` rejects a forbidden request before body parsing and validation.
The quote domain's authentication `onRequest` hook runs first, so authorization
can safely inspect `request.session.user`.

The dependency records an important assumption: authorization only runs after
authentication has made a trusted user available.

Expose the hook through the authorization domain entry point.

### `plugins/app/authorization/authorization.plugin.js`

```js
import fp from 'fastify-plugin'
import {
  authorizationHookBuilderPlugin
} from './authorization.hook-builder.js'

export const authorizationPlugin = fp(
  async function authorizationPlugin (app) {
    app.register(authorizationHookBuilderPlugin)
  },
  {
    name: 'authorization',
    // Shared so route domains can opt in with `app.authorize(...)`.
    dependencies: ['authentication']
  }
)
```

Like authentication, authorization is intentionally shared with the quote
domain registered after it.

## Protect quote deletion

Import `forbiddenResponse` in `plugins/app/quotes/schemas.js` and add it to the
delete responses:

```js
import { forbiddenResponse } from '../authorization/schemas.js'

export const deleteQuoteResponse = {
  204: { type: 'null' },
  403: forbiddenResponse,
  404: { $ref: 'quoteError#' }
}
```

Then add the role hook to the existing delete route:

```js
app.delete(
  '/quotes/:id',
  {
    schema: {
      params: { $ref: 'idParam#' },
      response: deleteQuoteResponse
    },
    // New for this chapter: deleting a quote requires the administrator role.
    onRequest: app.authorize('admin')
  },
  async function (request, reply) {
    const deleted = await this.quotesRepository.remove(request.params.id)
    if (!deleted) {
      reply.code(404)
      return { message: 'Quote not found' }
    }
    reply.code(204).send()
  }
)
```

Update the quote plugin metadata too:

```js
{
  name: 'quotes-routes',
  encapsulate: true,
  dependencies: [
    'authentication-hooks',
    'authorization-hook-builder',
    'quotes-repository'
  ],
  decorators: {
    fastify: ['authenticate', 'authorize', 'quotesRepository']
  }
}
```

The quote domain entry point now records the new domain-level dependency:

```js
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

```js
app.register(async function application (app) {
  app.register(usersPlugin)
  app.register(passwordsPlugin)
  app.register(registrationPlugin)
  app.register(authenticationPlugin)
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

Run the suite:

```bash
npm test
```

## Summary

Quote Vault now separates identity from permission. Authentication protects
the complete quote domain, while the authorization hook builder creates a
reusable role policy for administrator-only operations.

The next chapter will add shared rate limits for both public and authenticated
requests.
