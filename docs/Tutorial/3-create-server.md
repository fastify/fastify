## Create a Fastify Server

n this chapter, we’ll start with the basics of setting up a Fastify server.
This will give you a foundation before we dive into features like routes, hooks,
and plugins.

### Initialize the Project

Start by creating a new directory for your Fastify application:

```bash
mkdir quote-vault
cd quote-vault
```

Next, initialize a new npm project and install the latest version of Fastify:

```bash
npm init -y
npm install fastify
```

To use ESM modules, add `“type”: “module”` to your package.json.

### The `fastify` Factory

Fastify provides a factory function to create a server instance. 
This function accepts an options object to configure your server.
For detailed information about available options, refer to the 
[documentation](https://fastify.dev/docs/latest/Reference/Server/#factory).

### Setting up the Server with Graceful Shutdown

Now, create a basic Fastify server that listens on port 3000. 
We'll handle graceful shutdowns using the [`close-with-grace`](https://github.com/mcollina/close-with-grace)
package, created by a Fastify lead maintainer.

Install `close-with-grace`:

```bash
npm install close-with-grace
```

Create a `server.js` file:

```javascript
import Fastify from 'fastify';
import closeWithGrace from 'close-with-grace';

// Factory function
const app = Fastify({ 
  logger: true // Activate logging
});

// Set up graceful shutdown
closeWithGrace(
  async ({ err }) => {
    if (err != null) {
      app.log.error(err);
    }

    await app.close();
  }
);

// Start the server
try {
  await app.listen({ port: 3000 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

Start the server:

```bash
node server.js
```

You should see a message indicating your Fastify server is running on port 3000.
