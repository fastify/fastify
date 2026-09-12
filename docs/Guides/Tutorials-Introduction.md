# Tutorials Introduction

Welcome to the Fastify tutorials! This guide will walk you through the core concepts of building applications with Fastify, one of the fastest web frameworks for Node.js.

## Prerequisites

Before starting, ensure you have:

- Node.js 18 or later installed
- A code editor of your choice
- Basic knowledge of JavaScript or TypeScript

## Setting Up Your Project

Create a new directory and initialize your project:

```bash
mkdir my-fastify-app
cd my-fastify-app
npm init -y
```

Install Fastify:

```bash
npm install fastify
```

## Your First Server

Create a file named `app.js` (or `app.ts` for TypeScript) and add the following code:

```javascript
// ESM
import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log('Server listening on port 3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
```

```javascript
// CommonJs
const fastify = require('fastify')({
  logger: true
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log('Server listening on port 3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
```

Run your server:

```bash
node app.js
```

## Routing

Routing determines how your application responds to client requests at specific endpoints. Fastify provides a simple and intuitive routing API.

### Basic Routes

```javascript
// ESM
import Fastify from 'fastify'

const fastify = Fastify({ logger: true })

// GET route
fastify.get('/', async (request, reply) => {
  return { hello: 'world' }
})

// POST route
fastify.post('/users', async (request, reply) => {
  const { name, email } = request.body
  return { status: 'created', name, email }
})

const start = async () => {
  await fastify.listen({ port: 3000 })
}

start()
```

```javascript
// CommonJs
const fastify = require('fastify')({ logger: true })

// GET route
fastify.get('/', async (request, reply) => {
  return { hello: 'world' }
})

// POST route
fastify.post('/users', async (request, reply) => {
  const { name, email } = request.body
  return { status: 'created', name, email }
})

const start = async () => {
  await fastify.listen({ port: 3000 })
}

start()
```

```typescript
// TypeScript
import Fastify from 'fastify'

const fastify = Fastify({ logger: true })

interface UserBody {
  name: string
  email: string
}

fastify.get<{ Querystring: { name?: string } }>('/', async (request, reply) => {
  return { hello: 'world' }
})

fastify.post<{ Body: UserBody }>('/users', async (request, reply) => {
  const { name, email } = request.body
  return { status: 'created', name, email }
})

const start = async () => {
  await fastify.listen({ port: 3000 })
}

start()
```

### Route Parameters

You can define dynamic segments in your routes using the colon syntax:

```javascript
// ESM
fastify.get('/users/:id', async (request, reply) => {
  const { id } = request.params
  return { userId: id }
})
```

```javascript
// CommonJs
fastify.get('/users/:id', async (request, reply) => {
  const { id } = request.params
  return { userId: id }
})
```

```typescript
// TypeScript
fastify.get<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
  const { id } = request.params
  return { userId: id }
})
```

## Hooks

Hooks are lifecycle events that let you execute code at specific points during request processing. They allow you to add custom logic without modifying your route handlers.

### onRequest Hook

Runs when a request is received:

```javascript
// ESM
fastify.addHook('onRequest', async (request, reply) => {
  console.log(`Request received: ${request.method} ${request.url}`)
})
```

```javascript
// CommonJs
fastify.addHook('onRequest', async (request, reply) => {
  console.log(`Request received: ${request.method} ${request.url}`)
})
```

### preHandler Hook

Runs before the route handler:

```javascript
// ESM
fastify.addHook('preHandler', async (request, reply) => {
  // Authentication check
  if (!request.headers.authorization) {
    reply.status(401).send({ error: 'unauthorized' })
  }
})
```

```javascript
// CommonJs
fastify.addHook('preHandler', async (request, reply) => {
  // Authentication check
  if (!request.headers.authorization) {
    reply.status(401).send({ error: 'unauthorized' })
  }
})
```

### onSend Hook

Runs before the response is sent:

```javascript
// ESM
fastify.addHook('onSend', async (request, reply, payload) => {
  console.log(`Response sent with status: ${reply.statusCode}`)
  return payload
})
```

```javascript
// CommonJs
fastify.addHook('onSend', async (request, reply, payload) => {
  console.log(`Response sent with status: ${reply.statusCode}`)
  return payload
})
```

## Error Handling

Fastify provides structured error handling to ensure your application returns consistent error responses.

### Built-in Error Responses

By default, Fastify returns JSON error responses:

```javascript
// ESM
fastify.get('/error', async (request, reply) => {
  reply.status(500).send({ error: 'Something went wrong' })
})
```

```javascript
// CommonJs
fastify.get('/error', async (request, reply) => {
  reply.status(500).send({ error: 'Something went wrong' })
})
```

### Custom Error Handler

You can set a global error handler:

```javascript
// ESM
fastify.setErrorHandler(async (error, request, reply) => {
  reply.status(error.statusCode || 500).send({
    error: error.message,
    statusCode: error.statusCode || 500
  })
})
```

```javascript
// CommonJs
fastify.setErrorHandler(async (error, request, reply) => {
  reply.status(error.statusCode || 500).send({
    error: error.message,
    statusCode: error.statusCode || 500
  })
})
```

### NotFound Handler

Handle routes that do not match:

```javascript
// ESM
fastify.setNotFoundHandler(async (request, reply) => {
  reply.status(404).send({ error: 'Route not found' })
})
```

```javascript
// CommonJs
fastify.setNotFoundHandler(async (request, reply) => {
  reply.status(404).send({ error: 'Route not found' })
})
```

## Decorators

Decorators let you add custom properties and methods to Fastify instances, requests, and replies. They are useful for injecting shared functionality like database connections, configuration, or utility methods.

### Instance Decorators

Add methods or values to the Fastify instance:

```javascript
// ESM
fastify.decorate('config', {
  appName: 'MyApp',
  version: '1.0.0'
})

fastify.get('/config', async (request, reply) => {
  return fastify.config
})
```

```javascript
// CommonJs
fastify.decorate('config', {
  appName: 'MyApp',
  version: '1.0.0'
})

fastify.get('/config', async (request, reply) => {
  return fastify.config
})
```

### Request Decorators

Add properties to the request object:

```javascript
// ESM
fastify.decorateRequest('user', null)

fastify.addHook('preHandler', async (request, reply) => {
  request.user = { id: 1, name: 'John' }
})

fastify.get('/profile', async (request, reply) => {
  return { user: request.user }
})
```

```javascript
// CommonJs
fastify.decorateRequest('user', null)

fastify.addHook('preHandler', async (request, reply) => {
  request.user = { id: 1, name: 'John' }
})

fastify.get('/profile', async (request, reply) => {
  return { user: request.user }
})
```

### Reply Decorators

Add methods to the reply object:

```javascript
// ESM
fastify.decorateReply('success', function (data) {
  this.send({ status: 'ok', data })
})

fastify.get('/data', async (request, reply) => {
  reply.success({ items: [1, 2, 3] })
})
```

```javascript
// CommonJs
fastify.decorateReply('success', function (data) {
  this.send({ status: 'ok', data })
})

fastify.get('/data', async (request, reply) => {
  reply.success({ items: [1, 2, 3] })
})
```

```typescript
// TypeScript
import Fastify from 'fastify'

const fastify = Fastify()

fastify.decorateReply('success', function (this: any, data: any) {
  this.send({ status: 'ok', data })
})

fastify.get('/data', async (request, reply) => {
  reply.success({ items: [1, 2, 3] })
})
```

## Next Steps

Now that you understand the basics, continue to the next guides to learn about:

- Plugins and encapsulation
- Validation and serialization
- Testing your Fastify application
- Production deployment
