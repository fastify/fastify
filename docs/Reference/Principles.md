# Technical Principles

Every decision in the Fastify framework and its official plugins is guided by
the following technical principles:

1. “Zero” overhead in production
2. “Good” developer experience
3. Works great for small & big projects alike
4. Easy to migrate to microservices (or even serverless) and back
5. Security & data validation
6. If something could be a plugin, it likely should be
7. Easily testable
8. Do not monkeypatch core
9. Semantic versioning & Long Term Support
10. Specification adherence

## "Zero" Overhead in Production

Fastify aims to implement its features by adding as minimal overhead to your
application as possible.
This is usually delivered by implementing fast algorithms and data structures,
as well as JavaScript-specific features.

Given that JavaScript does not offer zero-overhead data structures, this principle
is at odds with providing a great developer experience and providing more features,
as usually those cost some overhead.

## "Good" Developer Experience

Fastify aims to provide the best developer experience at the performance point
it is operating.
It provides a great out-of-the-box experience that is flexible enough to be
adapted to a variety of situations.

As an example, this means that binary addons are forbidden because most JavaScript
developers would not
have access to a compiler.

## Works great for small and big projects alike

We recognize that most applications start small and become more complex over time.
Fastify aims to grow with
the complexity of your application, providing advanced features to structure
your codebase.

## Easy to migrate to microservices (or even serverless) and back

How you deploy your routes should not matter. The framework should "just work".

## Security and Data Validation

Your web framework is the first point of contact with untrusted data, and it
needs to act as the first line of defense for your system.

## If something could be a plugin, it likely should

We recognize that there are an infinite amount of use cases for an HTTP framework
for Node.js. Catering to them in a single module would make the codebase unmaintainable.
Therefore we provide hooks and options to allow you to customize the framework
as you please.

## Easily testable

Testing Fastify applications should be a first-class concern.

## Do not monkeypatch core

Monkeypatch Node.js APIs or installing globals that alter the behavior of the
runtime makes building modular applications harder, and limit the use cases of Fastify.
Other frameworks do this and we do not.

## Semantic Versioning and Long Term Support

We provide a clear Long Term Support strategy so developers can know when to upgrade.

## Specification adherence

In doubt, we chose the strict behavior as defined by the relevant Specifications.
