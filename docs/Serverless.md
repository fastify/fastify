<h1 align="center">Serverless</h1>

Run serverless applications and REST APIs using your existing Fastify application.

### Contents

- [AWS Lambda](#aws-lambda)
- [Google Cloud Run](#google-cloud-run)

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

## Google Cloud Run

Unlike AWS Lambda or Google Cloud Functions, Google Cloud Run is a serverless **container** environment. It's primary purpose is to provide an infrastucture-abstracted environment to run arbitrary containers. As a result, Fastify can be deployed to Google Cloud Run with little-to-no code changes from the way you would write your Fastify app normally.

*Follow the steps below to deploy to Google Cloud Run if you are already familiar with gcloud or just follow their [quickstart](https://cloud.google.com/run/docs/quickstarts/build-and-deploy)*

### Adjust Fastfiy server

In order for Fastify to properly listen for requests within the container, be sure to set the correct port and address:

```js
const Fastify = require("fastify")

// Google Cloud Run will set this environment variable for you, so
// you can also use it to detect if you are running in Cloud Run
const IS_GOOGLE_CLOUD_RUN = process.env.K_SERVICE !== undefined

// You must listen on the port Cloud Run provides
const port = process.env.PORT || 3000

// You must listen on all IPV4 addresses in Cloud Run
const address = IS_GOOGLE_CLOUD_RUN ? "0.0.0.0" : undefined

const fastify = Fastify({ trustProxy: true })

async function start() {
  const address = await fastify.listen(port, address)

  console.log(`Listening on ${address}`)
}

start().catch(err => {
  console.error(err)
  process.exit(1)
})
```

### Add a Dockerfile

You can add any valid `Dockerfile` that packages and runs a Node app. A basic `Dockerfile` can be found in the official [gcloud docs](https://github.com/knative/docs/blob/2d654d1fd6311750cc57187a86253c52f273d924/docs/serving/samples/hello-world/helloworld-nodejs/Dockerfile).

```Dockerfile
# Use the official Node.js 10 image.
# https://hub.docker.com/_/node
FROM node:10

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./

# Install production dependencies.
RUN npm install --only=production

# Copy local code to the container image.
COPY . .

# Run the web service on container startup.
CMD [ "npm", "start" ]
```

### Add a .dockerignore

To keep build artifacts out of your container (which keeps it small and improves build times), add a `.dockerignore` file like the one below:

```.dockerignore
Dockerfile
README.md
node_modules
npm-debug.log
```

### Submit build

Next, submit your app to be built into a Docker image by running the following command (replacing `PROJECT-ID` and `APP-NAME` with your GCP project id and an app name:

```bash
gcloud builds submit --tag gcr.io/PROJECT-ID/APP-NAME
```

### Deploy Image

After your image has built, you can deploy it with the following command:

```bash
gcloud beta run deploy --image gcr.io/PROJECT-ID/APP-NAME --platform managed
```

Your app will be accessible from the URL GCP provides.
