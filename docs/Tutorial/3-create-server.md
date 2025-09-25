## Create a Fastify Server

In this chapter, we'll guide you through setting up a basic Fastify server. 
We'll briefly introduce essential concepts and internal mechanisms of Fastify 
to deepen your understanding of the framework.

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

In order to use ESM modules, your package.json file should contain `“type”: “module”`.

### The `fastify` Factory

Fastify provides a factory function to create a server instance. 
This function configures the behavior of your server through an options 
parameter. 
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
