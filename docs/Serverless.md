<h1 align="center">Serverless</h1>

Run serverless applications and REST APIs using your existing Fastify application.

> Fastify is not designed to run on the AWS Lambda platform.
The Fastify framework is designed to make implementing a traditional HTTP/S server easy.
The AWS Lambda platform services requests in a completely different manner than
a traditional HTTP/S server and is therefore at odds with Fastify's whole design.
Regardless, it is possible to use Fastify in this environment if you so choose.
This document describes how to do it. However, remember that
this is an unsupported usage of Fastify and you are on your own in terms of support.


## Serverless environments

The sample provided allows you to easily build serverless web applications/services and RESTful APIs using Fastify on top of AWS Lambda and Amazon API Gateway.


Having a normal Fastify application like this:

```js
const fastify = require('fastify');

const app = fastify({ serverFactory });

app.get('/', (request, reply) => reply.send({ hello: 'world' }));

app.listen(3000, () => console.log('server listening on 3000'));
```

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

When executed in your lambda function we don't need to listen to a specific port, so we just export the wrapper function `init` in this case. The [`lambda.js`](https://www.fastify.io/docs/latest/Server/#lambda.js) file will use this export.

When you execute your Fastify application like always, i.e. `node app.js` *(the detection for this could be `require.main === module`)*, you can normally listen to your port, so you can still run your Fastify function locally.

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


We define a custom `serverFactory` function, in which we create a new server with the help of [`aws-serverless-express`](https://github.com/awslabs/aws-serverless-express) (make sure you install the dependency `npm i --save aws-serverless-express`).
Then we call the exported `init` with the `serverFactory` function.
Finally inside the lambda `handler` function we wait for the Fastify app to be `ready` and do proxying the incoming event (API Gateway request) to the `proxy` function of [`aws-serverless-express`](https://github.com/awslabs/aws-serverless-express).


### Example

An example deployable with [claudia.js](https://claudiajs.com/tutorials/serverless-express.html) can be found [here](https://github.com/claudiajs/example-projects/tree/master/fastify-app-lambda).
