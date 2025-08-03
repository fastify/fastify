# Creating Routes

In this chapter, you'll learn how to define routes in Fastify. 
We'll set up essential endpoints for our *Quote Vault* API, enabling users 
to store, retrieve, update, and delete memorable quotes.

We'll explore Fastify’s routing methods and briefly discuss the underlying 
mechanisms that manage request routing internally.

### Defining Routes

Fastify provides multiple ways to define routes:

* **Full Declaration**: Explicitly declare routes using `fastify.route`,
c.f. [documentation](https://fastify.dev/docs/latest/Reference/Routes/#full-declaration).
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
  const id = Number(request.params.id)
  const quote = quotes.find(q => q.id === id);
  if (!quote) {
    reply.code(404).send({ message: 'Quote not found' })
  }
  return quote;
});

app.post('/quotes', async (request, reply) => {
  const quote = { id: id++, text: request.body.text };
  quotes.push(quote);
  reply.code(201).send(quote)
});
```

#### A few important details:

**`return` vs. `reply.send`**

As you notice, it is possible to directly return the reply 
body from the handler.
Fastify will sets the right content type automatically and
performs serialization.

Or you can explicitly call `reply.send()`.

**Accessing Request Data**

* **Route parameters (`request.params`)**: Defined using a colon (`:`) 
in the URL, e.g., `/quotes/:id`.
* **Request body (`request.body`)**: Parsed payload sent by clients.
* **Query parameters (`request.query`)**: Parameters in the query string, 
often used for pagination, e.g., `/quotes?limit=10`.


### All the routes

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

  reply.code(204).send();
});
```

### Testing Routes

You can test your routes using `curl` commands:

* **Add a new quote:**

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

### Internals involved

Fastify's routing is powered by the 
[`find-my-way`](https://github.com/delvedor/find-my-way) 
router, developed and maintained by Fastify's contributors. 
This router uses a highly performant Radix Tree (compact Prefix Tree) 
for efficient request/route matching.

Fastify initializes the router within its factory function
[here](https://github.com/fastify/fastify/blob/ad97fbb5630488b2c830ff7bc27f495b21b87243/fastify.js)
.

The internal function responsible for route configuration is 
[`buildRouting`](https://github.com/fastify/fastify/blob/main/lib/route.js).
This function essentially integrates `find-my-way` into Fastify plugin system
and request life cycle.

Route declaration methods are set to the instance inside the factory, e.g. 
`fastify.route()` is
[here](https://github.com/fastify/fastify/blob/ad97fbb5630488b2c830ff7bc27f495b21b87243/fastify.js)
.