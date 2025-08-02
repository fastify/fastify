## Create a Fastify Server

In this chapter, we'll guide you through setting up a basic Fastify server. 
We'll briefly introduce essential concepts and internal mechanisms of Fastify 
to deepen your understanding of the framework. This knowledge will equip you 
to become an effective and responsible user, capable of contributing to the 
Fastify ecosystem.

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

const app = Fastify({ 
  logger: true // Activate logging
});

// Set up graceful shutdown
closeWithGrace(
  { delay: 500 },
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

### Fastify Internals

The instance returned by the factory function provides access to public 
methods like `listen()`, which we used above. 
You can explore the source code of the factory function 
[here](https://github.com/fastify/fastify/blob/ad97fbb5630488b2c830ff7bc27f495b21b87243/fastify.js#L102)
. The `listen` method is set
[here](https://github.com/fastify/fastify/blob/ad97fbb5630488b2c830ff7bc27f495b21b87243/fastify.js#L338).

Internally, Fastify manages its state using symbol-defined properties to avoid 
collisions and distinguish them from public properties. Symbol identifiers 
typically have a `k` prefix. For instance, the internal state is `kState`:

```javascript
const fastify = {
  [kState]: {
    listening: false,
    closing: false,
    started: false,
    ready: false,
    booting: false,
    aborted: false,
    readyResolver: null
  },
  // ...additional internals
}
```

Explore all internal symbols defined by Fastify 
[here](https://github.com/fastify/fastify/blob/main/lib/symbols.js).
