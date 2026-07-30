# OpenAPI documentation with Swagger

Quote Vault validates requests and serializes responses with TypeBox schemas.
Those schemas already describe most of the HTTP contract. We can reuse them to
generate API documentation instead of maintaining a separate document by hand.

In this chapter, we are going to:

* generate an OpenAPI document from Fastify route schemas,
* serve an interactive Swagger UI,
* organize operations with summaries and tags,
* describe the request body, parameters, responses, and session cookie,
* authenticate from the documentation,
* and test the generated contract.

## OpenAPI and Swagger

OpenAPI is a standard format for describing an HTTP API. An OpenAPI document
can describe paths, methods, parameters, request bodies, responses, and
authentication requirements in a form that both people and tools understand.

We will use two Fastify plugins:

* [`@fastify/swagger`](https://github.com/fastify/fastify-swagger) generates the
  OpenAPI document from route schemas.
* [`@fastify/swagger-ui`](https://github.com/fastify/fastify-swagger-ui)
  serves a browser interface for reading that document and making requests.

The plugins do not replace validation. The same `schema` objects still tell
Fastify how to validate input and serialize output. Swagger reads those objects
to produce another view of the same contract.

This is one reason we introduced TypeBox when the first schema appeared. A
single schema now provides:

* runtime validation,
* response serialization,
* TypeScript inference,
* and OpenAPI documentation.

## Install the plugins

Install the plugins:

```bash
npm i @fastify/swagger @fastify/swagger-ui
```

`@fastify/swagger` supports two modes. Static mode serves an existing OpenAPI
file. Dynamic mode, which is the default and the one used here, discovers
Fastify routes and generates the document from their schemas.

## Configure OpenAPI and Swagger UI

Swagger is a third-party integration shared by the whole application, so keep
it with the other infrastructure plugins.

### `plugins/infrastructure/swagger.ts`

```ts
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import fp from 'fastify-plugin'

const HIDE_COOKIE_AUTHORIZATION = `
.swagger-ui .auth-wrapper,
.swagger-ui .authorization__btn {
  display: none;
}
`

export const swaggerPlugin = fp(
  async function swaggerPlugin (app) {
    await app.register(fastifySwagger, {
      hideUntagged: true,
      openapi: {
        openapi: '3.1.0',
        info: {
          title: 'Quote Vault API',
          description: 'Create an account and manage memorable quotes.',
          version: '1.0.0'
        },
        tags: [
          {
            name: 'Authentication',
            description: 'Account registration and cookie sessions.'
          },
          {
            name: 'Quotes',
            description: 'Authenticated quote operations.'
          }
        ],
        components: {
          securitySchemes: {
            cookieAuth: {
              type: 'apiKey',
              in: 'cookie',
              name: app.config.SESSION_COOKIE_NAME,
              description: 'The signed session cookie returned by POST /login.'
            }
          }
        }
      }
    })

    await app.register(fastifySwaggerUi, {
      routePrefix: '/documentation',
      staticCSP: true,
      theme: {
        title: 'Quote Vault API documentation',
        css: [
          {
            filename: 'hide-cookie-authorization.css',
            content: HIDE_COOKIE_AUTHORIZATION
          }
        ]
      },
      uiConfig: {
        deepLinking: true,
        docExpansion: 'list',
        // Send the HttpOnly session cookie stored after trying POST /login.
        withCredentials: true
      }
    })
  },
  {
    name: 'swagger',
    dependencies: ['env']
  }
)
```

Passing `openapi` selects OpenAPI instead of the older Swagger 2 format.
`hideUntagged` keeps internal or tutorial-only routes out of the document. We
will add a tag only to operations that form part of the public API.

The `cookieAuth` security scheme describes the cookie created in the
authentication chapter. OpenAPI models cookie authentication as an API key
whose location is `cookie`. The name comes from validated configuration, so
the document matches the cookie that the application actually reads.

Swagger UI is available under `/documentation`. It also exposes the generated
document as JSON and YAML:

* `/documentation/json`
* `/documentation/yaml`

`staticCSP` adds a Content Security Policy to the UI assets. The UI remains
public in this tutorial. An application whose API shape is sensitive should
restrict or disable documentation in production as an explicit deployment
policy.

The OpenAPI security scheme is useful to clients and tools, but Swagger UI
cannot set a browser's `Cookie` header. The small theme stylesheet hides its
unusable authorization controls. The working browser flow will use the login
operation instead.

## Register Swagger before routes

`@fastify/swagger` observes routes as they are registered. It must therefore be
registered before the routes that should appear in the document.

Update the infrastructure entry point:

### `plugins/infrastructure/infrastructure.plugin.ts`

```ts
import { swaggerPlugin } from './swagger.ts'

export const infrastructurePlugin = fp<InfrastructureOptions>(
  async function infrastructurePlugin (app, options) {
    app.register(envPlugin, { override: options.env })
    // Add Swagger plugin here
    app.register(swaggerPlugin)

    app.register(corsPlugin, { override: options.cors })
    app.register(redisPlugin, { override: options.redis })
    app.register(sessionPlugin, { override: options.session })
    app.register(knexPlugin, { override: options.knex })
    app.register(rateLimitPlugin, { override: options.rateLimit })
  },
  { name: 'infrastructure' }
)
```

The environment plugin comes first because Swagger needs the configured cookie
name.

## Add useful schema descriptions

TypeBox accepts JSON Schema annotations such as `description`. They do not
change validation, but they help readers understand the fields displayed by
Swagger UI.

Add a shared description to the existing password property:

### `plugins/app/passwords/schemas.ts`

```ts
export const passwordProperty = Type.String({
  minLength: 12,
  maxLength: 128,
  pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s]).+$',
  description: 'A password that satisfies the displayed constraints.'
})
```

Then describe the registration fields:

### `plugins/app/registration/schemas.ts`

```ts
export const registrationBody = Type.Object(
  {
    username: Type.String({
      minLength: 1,
      maxLength: 100,
      description: 'The public display name.'
    }),
    email: Type.String({
      format: 'email',
      description: 'The unique account email address.'
    }),
    password: passwordProperty
  },
  { additionalProperties: false }
)
```

Apply the same idea to the login email and the quote input schemas:

### `plugins/app/authentication/schemas.ts`

```ts
export const credentialsBody = Type.Object(
  {
    email: Type.String({
      format: 'email',
      description: 'The account email address.'
    }),
    password: passwordProperty
  },
  { additionalProperties: false }
)
```

### `plugins/app/quotes/schemas.ts`

```ts
export const idParam = Type.Object(
  {
    id: Type.Integer({
      minimum: 1,
      description: 'The quote identifier.'
    })
  }
)

export const quoteBody = Type.Object(
  {
    text: Type.String({
      minLength: 1,
      description: 'The memorable text to store.'
    })
  },
  { additionalProperties: false }
)

export const listQuery = Type.Object(
  {
    limit: Type.Optional(Type.Integer({
      minimum: 1,
      description: 'The maximum number of quotes to return.'
    }))
  },
  { additionalProperties: false }
)
```

Swagger maps `id` to a path parameter, `limit` to a query parameter, and
`quoteBody` to an `application/json` request body because of where each schema
is attached to its route. A JSON request body also tells clients that the
operation accepts the `Content-Type: application/json` header. We do not need
to describe that header separately.

## Document the login cookie

The login operation creates a session through the `Set-Cookie` response header.
Add that header to its successful response schema:

### `plugins/app/authentication/schemas.ts`

```ts
export const loginResponse = {
  200: Type.Object(
    {
      user: userSchema
    },
    {
      additionalProperties: false,
      description: 'The authenticated user.',
      'x-response-description': 'The session started successfully.',
      headers: {
        'set-cookie': Type.String({
          description: 'The signed HttpOnly session cookie.'
        })
      }
    }
  ),
  401: authenticationError
}
```

The response body is still serialized from the object properties. The
additional response annotations tell OpenAPI that a successful login also
returns a cookie header.

We describe the cookie but do not expose its value to application JavaScript.
The session configuration keeps it `HttpOnly`, so the browser can store and
send it while scripts cannot read it.

## Describe operations and authentication

Fastify route schemas also accept OpenAPI operation fields. Add a tag, summary,
and security requirement beside the schemas that already validate each route.

The public login route explicitly has no security requirement:

### `plugins/app/authentication/authentication.routes.ts`

```ts
app.post(
  '/login',
  {
    schema: {
      tags: ['Authentication'],
      summary: 'Log in',
      description: 'Starts a session and returns its signed identifier in an HttpOnly cookie.',
      security: [],
      body: credentialsBody,
      response: loginResponse
    }
  },
  async function (request, reply) {
    // Keep the existing handler.
  }
)
```

Registration is public as well:

```ts
schema: {
  tags: ['Authentication'],
  summary: 'Register an account',
  security: [],
  body: registrationBody,
  response: registrationResponse
}
```

Authenticated operations refer to the `cookieAuth` scheme:

```ts
// GET /me
schema: {
  tags: ['Authentication'],
  summary: 'Read the current user',
  security: [{ cookieAuth: [] }],
  response: meResponse
}

// POST /logout
schema: {
  tags: ['Authentication'],
  summary: 'Log out',
  security: [{ cookieAuth: [] }],
  response: logoutResponse
}
```

Apply the same metadata to each quote operation. The schemas for bodies,
parameters, queries, and responses remain unchanged:

```ts
// POST /quotes
schema: {
  tags: ['Quotes'],
  summary: 'Create a quote',
  security: [{ cookieAuth: [] }],
  body: quoteBody,
  response: singleQuoteResponse
}
```

The delete operation also records its role requirement:

```ts
schema: {
  tags: ['Quotes'],
  summary: 'Delete a quote',
  description: 'Requires the administrator role.',
  security: [{ cookieAuth: [] }],
  params: idParam,
  response: deleteQuoteResponse
}
```

OpenAPI says that a session is required. The description explains the
application-specific administrator policy. The existing `requireRoles('admin')`
hook remains responsible for enforcing that policy.

The authentication hook can return `401` before a quote handler runs. Reuse its
error schema in the quote response maps so the document includes that outcome:

### `plugins/app/quotes/schemas.ts`

```ts
import { authenticationError } from '../authentication/schemas.ts'

export const listQuotesResponse = {
  200: Type.Array(quoteResponse),
  401: authenticationError
}

export const singleQuoteResponse = {
  '2xx': quoteResponse,
  401: authenticationError,
  404: quoteError
}

export const deleteQuoteResponse = {
  204: Type.Null(),
  401: authenticationError,
  403: forbiddenResponse,
  404: quoteError
}
```

The create and update routes both use `singleQuoteResponse`, so the shared
addition documents their authentication failure too.

Add corresponding summaries to the remaining quote routes:

* `List quotes` for `GET /quotes`,
* `Read a quote` for `GET /quotes/:id`,
* and `Replace a quote` for `PUT /quotes/:id`.

All use the `Quotes` tag and `security: [{ cookieAuth: [] }]`.

## Authenticate from Swagger UI

Start the application after the local PostgreSQL and Redis containers are
running:

```bash
npm run dev
```

Open `http://127.0.0.1:3000/documentation/` in a browser. Expand `POST /login`,
select **Try it out**, and use the seeded account:

```json
{
  "email": "user@example.com",
  "password": "User-password1!"
}
```

Execute the request. The login response sets the signed, `HttpOnly` session
cookie. The browser stores it, and `withCredentials: true` lets Swagger UI send
the stored cookie on later requests. We can now try `GET /me` and the quote
read, create, and update operations from the same page.

The regular user cannot delete a quote. Trying `DELETE /quotes/:id` with this
session returns `403 Forbidden`, as required by the authorization policy from
chapter 17.

To verify deletion, first execute `POST /logout`, then log in again with the
seeded administrator:

```json
{
  "email": "admin@example.com",
  "password": "Admin-password1!"
}
```

Create a quote or select an existing quote ID, then execute
`DELETE /quotes/:id`. The administrator receives `204 No Content` when that
quote exists.

The OpenAPI document keeps the cookie security scheme so clients and other
tools know which operations require authentication. The theme hides Swagger
UI's corresponding authorization controls because browsers forbid JavaScript
from setting the `Cookie` request header. Use the documented login operation
instead. This keeps the cookie `HttpOnly` and tests the same flow as a real
client.

If the local `SESSION_COOKIE_SECURE` setting is `true`, an HTTP browser session
will reject the secure cookie. Keep the tutorial's local value set to `false`;
production deployments should use HTTPS and set it to `true`.

Use `POST /logout` again when the manual check is complete. It destroys the
administrator session and expires the browser cookie.

## Summary

Quote Vault now publishes an OpenAPI document and an interactive Swagger UI
from the schemas already used at runtime.
