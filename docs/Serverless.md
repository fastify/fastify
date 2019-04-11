<h1 align="center">Serverless</h1>

Run serverless applications and REST APIs using your existing Fastify application.

### Attention Readers:
> Fastify is not designed to run on serverless environments.
The Fastify framework is designed to make implementing a traditional HTTP/S server easy.
Serverless environments requests differently than a standard HTTP/S server;
thus, we cannot guarantee it will work as expected with Fastify.
Regardless, based on the examples given in this document,
it is possible to use Fastify in a serverless environment.
Again, keep in mind that this is not Fastify's intended use case and
we do not test for such integration scenarios.


## AWS Lambda

The sample provided allows you to easily build serverless web applications/services
and RESTful APIs using Fastify on top of AWS Lambda and Amazon API Gateway.

*Note: This is just one possible way.*

### app.js

```js
const fastify = require('fastify');

function init(serverFactory) {
  const app = fastify({ serverFactory });
  app.get('/', (request, reply) => reply.send({ hello: 'world' }));
  return app;
}

if (require.main !== module) {
  // called directly i.e. "node app"
  init().listen(3000, (err) => {
    if (err) console.error(err);
    console.log('server listening on 3000');
  });
} else {
  // required as a module => executed on aws lambda
  module.exports = init;
}
```

You can simply wrap your initialization code by offering to inject an optional [serverFactory](https://www.fastify.io/docs/latest/Server/#serverfactory).

When executed in your lambda function we don't need to listen to a specific port,
so we just export the wrapper function `init` in this case.
The [`lambda.js`](https://www.fastify.io/docs/latest/Server/#lambda.js) file will use this export.

When you execute your Fastify application like always,
i.e. `node app.js` *(the detection for this could be `require.main === module`)*,
you can normally listen to your port, so you can still run your Fastify function locally.

### lambda.js

```js
const awsServerlessExpress = require('aws-serverless-express');
const init = require('./app');

let server;
const serverFactory = (handler) => {
  server = awsServerlessExpress.createServer(handler);
  return server;
}
const app = init(serverFactory);

exports.handler = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  app.ready((e) => {
    if (e) return console.error(e.stack || e);
    awsServerlessExpress.proxy(server, event, context, 'CALLBACK', callback);
  });
};
```

We define a custom `serverFactory` function, in which we create a new server with the help of [`aws-serverless-express`](https://github.com/awslabs/aws-serverless-express)
(make sure you install the dependency `npm i --save aws-serverless-express`).
Then we call the `init` function (imported from [`app.js`](https://www.fastify.io/docs/latest/Server/#app.js)) with the `serverFactory` function as the only parameter.
Finally inside the lambda `handler` function we wait for the Fastify app to be `ready`
and proxy all the incoming events (API Gateway requests) to the `proxy` function from [`aws-serverless-express`](https://github.com/awslabs/aws-serverless-express).


### Example

An example deployable with [claudia.js](https://claudiajs.com/tutorials/serverless-express.html) can be found [here](https://github.com/claudiajs/example-projects/tree/master/fastify-app-lambda).


### Considerations

- API Gateway doesn't support streams yet, so you're not able to handle [streams](https://www.fastify.io/docs/latest/Reply/#streams). 
- API Gateway has a timeout of 29 seconds, so it's important to provide a reply during this time.
