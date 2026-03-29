# Create a Fastify Server

In this chapter, we’ll start with the basics of setting up a Fastify server.
This will give you a foundation before we dive into features like routes, hooks,
and plugins.

## Initialize the project

Start by creating a new directory for your Fastify application:

```bash
mkdir quote-vault
cd quote-vault
```

Next, initialize a new npm project and install the latest version of Fastify:

```bash
npm init -y
npm install fastify@5
```

To use ESM modules as we do in this tutorial, we need to set the `type` field
in `package.json` to `module`:

```bash
npm pkg set type=module
```

Now, we are ready to create our first Fastify server!

## Write the server code

Create a new file named `server.js` in your project directory and
open it in your favorite code editor.

Fastify provides a [factory] function to create a server instance. 
This function accepts an options object to configure every aspect of the server.

The simplest Fastify server can be created as follows:

```js
import fastify from 'fastify'

// Factory function
const app = fastify({
  logger: true // Activate logging
})

app.get('/', function httpHandler (request, reply) {
  return { hello: 'world' }
})

// Start the server
await app.listen({ host: '0.0.0.0', port: 3000 })
```

By running this code, you create a Fastify server instance with logging enabled.

To see it in action, run the server using Node.js:

```bash
node server.js
```

You should see a message indicating your Fastify server is running on port 3000.

To verify, open your browser and navigate to `http://localhost:3000/`.
If everything is set up correctly, the greeting message should appear!
Congratulations on creating your first Fastify server 🎉!

In this tutorial, we enabled logging by passing `{ logger: true }` to the
`fastify` factory function. Fastify's logger is built on top of [Pino](https://getpino.io/),
a very fast and low-overhead logging library.
For a complete and detailed list of available options, refer to the
[documentation](/docs/latest/Reference/Server/#factory).

### Graceful shutdown

To stop the server, you can use `CTRL + C` in your terminal.
This will terminate the process immediately. However, in a production environment,
it's important to handle shutdowns gracefully to ensure that all ongoing requests
are completed before the server stops.

To implement graceful shutdowns in our Fastify server,
we can use the [`close-with-grace`](https://github.com/mcollina/close-with-grace)
package!

```bash
npm install close-with-grace
```

After installing the package, update your `server.js` file as follows:

```js
import fastify from 'fastify'
import closeWithGrace from 'close-with-grace'

const app = fastify({
  logger: true
})

// Define a SLOW route for demonstration
app.get('/slow', async function slowHandler (request, reply) {
  await new Promise(resolve => setTimeout(resolve, 10_000)) // Simulate a slow HTTP request
  return { hello: 'world' }
})

// Set up graceful shutdown
closeWithGrace(
  async ({ err }) => {
    if (err != null) {
      app.log.error(err)
    }

    await app.close()
    app.log.info('Server closed gracefully')
  }
)

// Start the server
try {
  await app.listen({ host: '0.0.0.0', port: 3000 })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
```

Now, when the Node.js process receives a termination signal (like `SIGINT` or `SIGTERM`),
the server will close gracefully, ensuring all ongoing requests are completed
through the `app.close()` method.

Let's test it out by running the server again:

```bash
node server.js
```

You can now send a request to the `/slow` endpoint to simulate a long-running request.
While that request is being processed, try stopping the server with `CTRL + C`.
The server will wait for the `/slow` request to complete before shutting down!

## Summary

In this section, we got our feet wet by creating a basic Fastify server.
We also learned how to implement graceful shutdowns to ensure that our server
can handle termination signals properly.
Now that we have a running server, we can move on to adding more features like routes,
plugins, and hooks in the next chapters!


[factory]: https://en.wikipedia.org/wiki/Factory_method_pattern
