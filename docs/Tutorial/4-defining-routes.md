# Creating Routes

In this chapter, you'll learn how to define routes in Fastify.
We'll set up essential endpoints for our *Quote Vault* API, enabling users
to store, retrieve, update, and delete memorable quotes.

We'll explore Fastify’s routing methods and briefly discuss the underlying
mechanisms that manage routing internally.

### Defining Routes

Fastify provides multiple ways to define routes:

* **Full Declaration**: Explicitly declare routes using `fastify.route`,
  see [documentation](https://fastify.dev/docs/latest/Reference/Routes/#full-declaration).
* **Shorthand Methods**: Convenient methods like `fastify.get()`,
  `fastify.post()`, `fastify.put()`, and others.

We'll use shorthand methods for simplicity.

Let's start by creating a basic in-memory API:

```javascript
// Simple in-memory database
let id = 1;
const quotes = [];

app.get("/quotes", async (request, reply) => {
  const { limit = 10 } = request.query;
  return quotes.slice(0, limit);
});

app.get('/quotes/:id', async (request, reply) => {
  const id = Number(request.params.id);
  const quote = quotes.find(q => q.id === id);
  if (!quote) {
    reply.code(404).send({ message: 'Quote not found' });
  }
  return quote;
});

app.post('/quotes', async (request, reply) => {
  const quote = { id: id++, text: request.body.text };
  quotes.push(quote);
  reply.code(201).send(quote);
});
```

Let's discuss a few important things here.

1. **Accessing Request Data**

   Fastify exposes parsed request data through intuitive properties:

   * **Route parameters** (`request.params`):
     Defined in the route path using `:` syntax, e.g. `/quotes/:id`.

   * **Request body** (`request.body`):
     The parsed payload sent by the client.

   * **Query parameters** (`request.query`):
     Typically used for pagination, e.g. `/quotes?limit=1`.

2. **Sending Responses: `return` vs. `reply.send()`**

   There are two ways to send a response in Fastify:

   **Returning a value directly**

   ```js
   return { hello: 'world' };
   ```

   Fastify automatically handles:

   * Serialization (e.g., JSON encoding)
   * Setting the correct `Content-Type` header

   **Using `reply.send()` explicitly**

   ```js
   reply.send({ hello: 'world' });
   ```

   #### Important Caveats

   * If you use both `return` and `reply.send()`, the first one takes 
   precedence and the second is ignored.

   * `undefined` cannot be returned directly.

   * If you use `reply.send()` in an async handler, make sure to `return`
     or `await` the `reply`.

   > See [related documentation](https://fastify.dev/docs/latest/Reference/Routes/#async-await)
   > for more details.

   In this tutorial, we'll return the value whenever possible.

#### Let's create all our routes now

```js
let id = 1;
const quotes = [];

app.get("/quotes", async (request, reply) => {
  const { limit = 10 } = request.query;
  return quotes.slice(0, limit);
});

app.get("/quotes/:id", async (request, reply) => {
  const id = Number(request.params.id);
  const quote = quotes.find((q) => q.id === id);
  if (!quote) {
    reply.code(404);
    return { message: "Quote not found" };
  }
  return quote;
});

app.post("/quotes", async (request, reply) => {
  const quote = { id: id++, text: request.body.text };
  quotes.push(quote);
  reply.code(201);
  return quote;
});

app.put("/quotes/:id", async (request, reply) => {
  const id = Number(request.params.id);
  const quote = quotes.find((q) => q.id === id);
  if (!quote) {
    reply.code(404);
    return { message: "Quote not found" };
  }

  quote.text = request.body.text;
  return quote;
});

app.delete("/quotes/:id", async (request, reply) => {
  const id = Number(request.params.id);
  const index = quotes.findIndex((q) => q.id === id);
  if (index === -1) {
    reply.code(404);
    return { message: "Quote not found" };
  }

  quotes.splice(index, 1);

  reply.code(204).send(); // Remember, undefined cannot be returned.
});
```

### Testing Routes

You can test your routes using `curl` commands:

* **Add a new quote:**

> When sending data in a request (e.g., POST or PUT),
> Fastify needs to know how to parse the incoming body.
> If you forget to set the `Content-Type` header,
> Fastify will respond with a `415 Unsupported Media Type` error.
> See [`FST_ERR_CTP_INVALID_MEDIA_TYPE`](https://fastify.dev/docs/latest/Reference/Errors/#fst_err_ctp_invalid_media_type).

```bash
curl -X POST http://localhost:3000/quotes \
  -H "Content-Type: application/json" \
  -d '{"text":"Fastify is awesome!"}'
```

* **Retrieve all quotes:**

```bash
curl http://localhost:3000/quotes
```

> You can also add a `limit` query parameter, e.g., `?limit=5`

* **Retrieve a specific quote by ID:**

```bash
curl http://localhost:3000/quotes/<quote-id>
```

* **Update a quote:**

```bash
curl -X PUT http://localhost:3000/quotes/<quote-id> \
  -H "Content-Type: application/json" \
  -d '{"text":"Updated quote text."}'
```

* **Delete a quote:**

```bash
curl -X DELETE http://localhost:3000/quotes/<quote-id>
```

Alternatively, you can use HTTP clients like
[Postman](https://www.postman.com/) or [Insomnia](https://insomnia.rest/)
for convenience.

> Later in this tutorial, we’ll look at how to write integration and end-to-end
> tests using `fastify.inject()`.
> This will help automate testing, reduce reliance on manual curl commands, and
> avoid regressions.

### Internals involved

Fastify's routing is powered by the
[`find-my-way`](https://github.com/delvedor/find-my-way)
router, developed and maintained by Fastify's contributors.
This router uses a highly performant Radix Tree (compact prefix tree)
for efficient request/route matching.

The internal function responsible for route configuration is
[`buildRouting`](https://github.com/fastify/fastify/blob/main/lib/route.js).
This function integrates `find-my-way` into Fastify's plugin system
and request lifecycle.


Fastify initializes the router and attach methods to the fastify instance 
inside the [factory](https://github.com/fastify/fastify/blob/main/fastify.js).
