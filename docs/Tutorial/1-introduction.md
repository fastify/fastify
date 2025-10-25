#  Introduction

This tutorial is designed to give a clear and practical understanding 
of how to build applications with Fastify.

We’ll progressively build a small REST API named *Quote Vault* - 
that allows users to store, retrieve, update, and delete memorable quotes. 
The name fits the purpose: we’ll treat quotes as something worth protecting, 
applying authentication, role-based access control, and other security 
best practices - all while benefiting from the performance Fastify is 
known for.

### Prerequisites

**Node.js 24 or later** installed.

You also need **curl** to test API endpoints from the command line.
Alternatively, you can use an HTTP client such as **Postman** if you prefer a graphical

A basic understanding of **JavaScript**, **Node.js**, **HTTP**, and 
**backend development** is expected.

### Basics

We’ll start by exploring Fastify’s core features:

- Setting up a basic Fastify server and defining routes
- Decorating the Fastify instance
- Adding validation and response serialization using JSON schemas
- Understanding and using application and request lifecycle hooks
- Implementing custom error handling and fallback (404) routes

### Structure and Encapsulation

Once the fundamentals are clear, we’ll introduce how to:

- Leverage the plugin system to modularize the application
- Use encapsulation to isolate plugins and prevent scoped 
  utilities from leaking into the global context.
- Share utilities globally

### Plugin Ecosystem and Integration

We’ll integrate some Core Fastify plugins to 
extend the application:

- Configuration
- Database integration
- CORS
- Rate limiting
- Monitoring and observability
- Authentication and authorization
- API documentation with Swagger
- Autoloading

### Testing

To ensure reliability and maintainability, we’ll set up a solid testing workflow:

- Use the built-in **Node.js test runner**
- Test routes and behaviors with **`fastify.inject()`**
- Get **code coverage** using
[`borp`](https://github.com/mcollina/borp), 
a lightweight runner with TypeScript support and built-in coverage

### Developer Experience and TypeScript

To finish, we’ll introduce Fastify’s TypeScript tools
and best practices:

- `@fastify/type-provider-typebox` for type-safe schemas
- Module augmentation to type decorators 
- Alternative to module augmentation with `getDecorator`