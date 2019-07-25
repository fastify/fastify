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

*Note: Using [aws-lambda-fastify](https://github.com/fastify/aws-lambda-fastify) is just one possible way.*

### app.js

```js
const fastify = require('fastify');

function init() {
  const app = fastify();
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

When executed in your lambda function we don't need to listen to a specific port,
so we just export the wrapper function `init` in this case.
The [`lambda.js`](https://www.fastify.io/docs/latest/Serverless/#lambda-js) file will use this export.

When you execute your Fastify application like always,
i.e. `node app.js` *(the detection for this could be `require.main === module`)*,
you can normally listen to your port, so you can still run your Fastify function locally.

### lambda.js

```js
const awsLambdaFastify = require('aws-lambda-fastify')
const init = require('./app');

const proxy = awsLambdaFastify(init())
// or
// const proxy = awsLambdaFastify(init(), { binaryMimeTypes: ['application/octet-stream'] })

exports.handler = proxy;
// or
// exports.handler = (event, context, callback) => proxy(event, context, callback);
// or
// exports.handler = (event, context) => proxy(event, context);
// or
// exports.handler = async (event, context) => proxy(event, context);
```

We just require [aws-lambda-fastify](https://github.com/fastify/aws-lambda-fastify)
(make sure you install the dependency `npm i --save aws-lambda-fastify`) and our
[`app.js`](https://www.fastify.io/docs/latest/Serverless/#app-js) file and call the
exported `awsLambdaFastify` function with the `app` as the only parameter.
The resulting `proxy` function has the correct signature to be used as lambda `handler` function. 
This way all the incoming events (API Gateway requests) are passed to the `proxy` function of [aws-lambda-fastify](https://github.com/fastify/aws-lambda-fastify).

### Example

An example deployable with [claudia.js](https://claudiajs.com/tutorials/serverless-express.html) can be found [here](https://github.com/claudiajs/example-projects/tree/master/fastify-app-lambda).


### Considerations

- API Gateway doesn't support streams yet, so you're not able to handle [streams](https://www.fastify.io/docs/latest/Reply/#streams). 
- API Gateway has a timeout of 29 seconds, so it's important to provide a reply during this time.
