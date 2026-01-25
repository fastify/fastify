# Introduction

This tutorial is designed to give a clear and practical understanding 
of how to build applications with Fastify.

We’ll progressively build a small REST API named *Quote Vault* - 
that allows users to store, retrieve, update, and delete memorable quotes. 
The name fits the purpose: we’ll treat quotes as something worth protecting, 
applying authentication, role-based access control, and other security 
best practices - all while benefiting from the performance Fastify is 
known for.


## Prerequisites

To follow along with this tutorial, these prerequisites are recommended:

- Basic understanding of **JavaScript**, **Node.js**, **HTTP**
- **Node.js 24 or later** installed
- An HTTP client such as **curl** or **Postman** to test the API
- Familiarity with a package manager such as **npm**
- Basic bash/shell skills for running commands


## What will we cover

We’ll start by exploring Fastify’s core features:

- Setting up a basic Fastify server and defining routes
- Decorating the Fastify instance
- Adding validation and response serialization using JSON schemas
- Understanding and using application and request lifecycle hooks
- Implementing custom error handling and fallback (404) routes
- Using the plugin system and encapsulation to structure our application


### Testing

To ensure reliability and maintainability, we’ll set up a solid testing workflow:

- Use the built-in **Node.js test runner**
- Test routes and behaviors with **`fastify.inject()`**
- Get **code coverage** using [`borp`](https://github.com/mcollina/borp), 
  a lightweight runner with TypeScript support and built-in coverage


### Plugin Ecosystem and Integration

We’ll integrate some Core Fastify plugins to  extend the application:

- Configuration
- Database integration
- CORS
- Rate limiting
- Monitoring and observability
- Authentication and authorization
- API documentation with Swagger


### TypeScript and Architecture

To finish, we’ll introduce Fastify’s TypeScript tools
and best practices:

- `@fastify/type-provider-typebox` for type-safe schemas
- Module augmentation to type decorators 
- Alternative to module augmentation with `getDecorator`

By the end of this tutorial, you’ll have a solid understanding of how to
build, test, and maintain a Fastify application, along with practical
experience in implementing common backend features.

Let’s get started! 🚀
