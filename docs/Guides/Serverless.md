<h1 align="center">Serverless</h1>

Run serverless applications and REST APIs using your existing Fastify
application. By default, Fastify will not work on your serverless platform of
choice, you will need to make some small changes to fix this. This document
contains a small guide for the most popular serverless providers and how to use
Fastify with them.

#### Should you use Fastify in a serverless platform?

That is up to you! Keep in mind that functions as a service should always use
small and focused functions, but you can also run an entire web application with
them. It is important to remember that the bigger the application the slower the
initial boot will be. The best way to run Fastify applications in serverless
environments is to use platforms like Google Cloud Run, AWS Fargate, and Azure
Container Instances, where the server can handle multiple requests at the same
time and make full use of Fastify's features.

One of the best features of using Fastify in serverless applications is the ease
of development. In your local environment, you will always run the Fastify
application directly without the need for any additional tools, while the same
code will be executed in your serverless platform of choice with an additional
snippet of code.

### Contents

- [AWS](#aws)
- [Google Cloud Functions](#google-cloud-functions)
- [Google Cloud Run](#google-cloud-run)
- [Netlify Lambda](#netlify-lambda)
- [Vercel](#vercel)

## AWS

To integrate with AWS, you have two choices of library:

- Using [@fastify/aws-lambda](https://github.com/fastify/aws-lambda-fastify) 
  which only adds API Gateway support but has heavy optimizations for fastify.
- Using [@h4ad/serverless-adapter](https://github.com/H4ad/serverless-adapter) 
  which is a little slower as it creates an HTTP request for each AWS event but 
  has support for more AWS services such as: AWS SQS, AWS SNS and others.

So you can decide which option is best for you, but you can test both libraries.

### Using @fastify/aws-lambda

The sample provided allows you to easily build serverless web
applications/services and RESTful APIs using Fastify on top of AWS Lambda and
Amazon API Gateway.

#### app.js

```js
const fastify = require('fastify');

function init() {
  const app = fastify();
  app.get('/', (request, reply) => reply.send({ hello: 'world' }));
  return app;
}

if (require.main === module) {
  // called directly i.e. "node app"
  init().listen({ port: 3000 }, (err) => {
    if (err) console.error(err);
    console.log('server listening on 3000');
  });
} else {
  // required as a module => executed on aws lambda
  module.exports = init;
}
```

When executed in your lambda function we do not need to listen to a specific
port, so we just export the wrapper function `init` in this case. The
[`lambda.js`](#lambdajs) file will use this export.

When you execute your Fastify application like always, i.e. `node app.js` *(the
detection for this could be `require.main === module`)*, you can normally listen
to your port, so you can still run your Fastify function locally.

#### lambda.js

```js
const awsLambdaFastify = require('@fastify/aws-lambda')
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

We just require
[@fastify/aws-lambda](https://github.com/fastify/aws-lambda-fastify) (make sure
you install the dependency `npm i @fastify/aws-lambda`) and our
[`app.js`](#appjs) file and call the exported `awsLambdaFastify` function with
the `app` as the only parameter. The resulting `proxy` function has the correct
signature to be used as a lambda `handler` function. This way all the incoming
events (API Gateway requests) are passed to the `proxy` function of
[@fastify/aws-lambda](https://github.com/fastify/aws-lambda-fastify).

#### Example

An example deployable with
[claudia.js](https://claudiajs.com/tutorials/serverless-express.html) can be
found
[here](https://github.com/claudiajs/example-projects/tree/master/fastify-app-lambda).

### Considerations

- API Gateway does not support streams yet, so you are not able to handle
  [streams](../Reference/Reply.md#streams).
- API Gateway has a timeout of 29 seconds, so it is important to provide a reply
  during this time.

#### Beyond API Gateway

If you need to integrate with more AWS services, take a look at
[@h4ad/serverless-adapter](https://viniciusl.com.br/serverless-adapter/docs/main/frameworks/fastify)
on Fastify to find out how to integrate.

## Google Cloud Functions

### Creation of Fastify instance
```js
const fastify = require("fastify")({
  logger: true // you can also define the level passing an object configuration to logger: {level: 'debug'}
});
```

### Add Custom `contentTypeParser` to Fastify instance

As explained [in issue
#946](https://github.com/fastify/fastify/issues/946#issuecomment-766319521),
since the Google Cloud Functions platform parses the body of the request before
it arrives at the Fastify instance, troubling the body request in case of `POST`
and `PATCH` methods, you need to add a custom [`Content-Type
Parser`](../Reference/ContentTypeParser.md) to mitigate this behavior.

```js
fastify.addContentTypeParser('application/json', {}, (req, body, done) => {
  done(null, body.body);
});
```

### Define your endpoint (examples)

A simple `GET` endpoint:
```js
fastify.get('/', async (request, reply) => {
  reply.send({message: 'Hello World!'})
})
```

Or a more complete `POST` endpoint with schema validation:
```js
fastify.route({
  method: 'POST',
  url: '/hello',
  schema: {
    body: {
      type: 'object',
      properties: {
        name: { type: 'string'}
      },
      required: ['name']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: {type: 'string'}
        }
      }
    },
  },
  handler: async (request, reply) => {
    const { name } = request.body;
    reply.code(200).send({
      message: `Hello ${name}!`
    })
  }
})
```

### Implement and export the function

Final step, implement the function to handle the request and pass it to Fastify
by emitting `request` event to `fastify.server`:

```js
const fastifyFunction = async (request, reply) => {
  await fastify.ready();
  fastify.server.emit('request', request, reply)
}

export.fastifyFunction = fastifyFunction;
```

### Local test

Install [Google Functions Framework for
Node.js](https://github.com/GoogleCloudPlatform/functions-framework-nodejs).

You can install it globally:
```bash
npm i -g @google-cloud/functions-framework
```

Or as a development library:
```bash
npm i -D @google-cloud/functions-framework
```

Then you can run your function locally with Functions Framework:
```bash
npx @google-cloud/functions-framework --target=fastifyFunction
```

Or add this command to your `package.json` scripts:
```json
"scripts": {
...
"dev": "npx @google-cloud/functions-framework --target=fastifyFunction"
...
}
```
and run it with `npm run dev`.


### Deploy
```bash
gcloud functions deploy fastifyFunction \
--runtime nodejs14 --trigger-http --region $GOOGLE_REGION --allow-unauthenticated
```

#### Read logs
```bash
gcloud functions logs read
```

#### Example request to `/hello` endpoint
```bash
curl -X POST https://$GOOGLE_REGION-$GOOGLE_PROJECT.cloudfunctions.net/me \
  -H "Content-Type: application/json" \
  -d '{ "name": "Fastify" }'
{"message":"Hello Fastify!"}
```

### References
- [Google Cloud Functions - Node.js Quickstart
  ](https://cloud.google.com/functions/docs/quickstart-nodejs)

## Google Cloud Run

Unlike AWS Lambda or Google Cloud Functions, Google Cloud Run is a serverless
**container** environment. Its primary purpose is to provide an
infrastructure-abstracted environment to run arbitrary containers. As a result,
Fastify can be deployed to Google Cloud Run with little-to-no code changes from
the way you would write your Fastify app normally.

*Follow the steps below to deploy to Google Cloud Run if you are already
familiar with gcloud or just follow their
[quickstart](https://cloud.google.com/run/docs/quickstarts/build-and-deploy)*.

### Adjust Fastify server

In order for Fastify to properly listen for requests within the container, be
sure to set the correct port and address:

```js
function build() {
  const fastify = Fastify({ trustProxy: true })
  return fastify
}

async function start() {
  // Google Cloud Run will set this environment variable for you, so
  // you can also use it to detect if you are running in Cloud Run
  const IS_GOOGLE_CLOUD_RUN = process.env.K_SERVICE !== undefined

  // You must listen on the port Cloud Run provides
  const port = process.env.PORT || 3000

  // You must listen on all IPV4 addresses in Cloud Run
  const host = IS_GOOGLE_CLOUD_RUN ? "0.0.0.0" : undefined

  try {
    const server = build()
    const address = await server.listen({ port, host })
    console.log(`Listening on ${address}`)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

module.exports = build

if (require.main === module) {
  start()
}
```

### Add a Dockerfile

You can add any valid `Dockerfile` that packages and runs a Node app. A basic
`Dockerfile` can be found in the official [gcloud
docs](https://github.com/knative/docs/blob/2d654d1fd6311750cc57187a86253c52f273d924/docs/serving/samples/hello-world/helloworld-nodejs/Dockerfile).

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
RUN npm i --production

# Copy local code to the container image.
COPY . .

# Run the web service on container startup.
CMD [ "npm", "start" ]
```

### Add a .dockerignore

To keep build artifacts out of your container (which keeps it small and improves
build times) add a `.dockerignore` file like the one below:

```.dockerignore
Dockerfile
README.md
node_modules
npm-debug.log
```

### Submit build

Next, submit your app to be built into a Docker image by running the following
command (replacing `PROJECT-ID` and `APP-NAME` with your GCP project id and an
app name):

```bash
gcloud builds submit --tag gcr.io/PROJECT-ID/APP-NAME
```

### Deploy Image

After your image has built, you can deploy it with the following command:

```bash
gcloud beta run deploy --image gcr.io/PROJECT-ID/APP-NAME --platform managed
```

Your app will be accessible from the URL GCP provides.


## netlify-lambda

First, please perform all preparation steps related to **AWS Lambda**.

Create a folder called `functions`,  then create `server.js` (and your endpoint
path will be `server.js`) inside the `functions` folder.

### functions/server.js

```js
export { handler } from '../lambda.js'; // Change `lambda.js` path to your `lambda.js` path
```

### netlify.toml

```toml
[build]
  # This will be run the site build
  command = "npm run build:functions"
  # This is the directory is publishing to netlify's CDN
  # and this is directory of your front of your app
  # publish = "build"
  # functions build directory
  functions = "functions-build" # always appends `-build` folder to your `functions` folder for builds
```

### webpack.config.netlify.js

**Do not forget to add this Webpack config, or else problems may occur**

```js
const nodeExternals = require('webpack-node-externals');
const dotenv = require('dotenv-safe');
const webpack = require('webpack');

const env = process.env.NODE_ENV || 'production';
const dev = env === 'development';

if (dev) {
  dotenv.config({ allowEmptyValues: true });
}

module.exports = {
  mode: env,
  devtool: dev ? 'eval-source-map' : 'none',
  externals: [nodeExternals()],
  devServer: {
    proxy: {
      '/.netlify': {
        target: 'http://localhost:9000',
        pathRewrite: { '^/.netlify/functions': '' }
      }
    }
  },
  module: {
    rules: []
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.APP_ROOT_PATH': JSON.stringify('/'),
      'process.env.NETLIFY_ENV': true,
      'process.env.CONTEXT': env
    })
  ]
};
```

### Scripts

Add this command to your `package.json` *scripts*

```json
"scripts": {
...
"build:functions": "netlify-lambda build functions --config ./webpack.config.netlify.js"
...
}
```

Then it should work fine


## Vercel

[Vercel](https://vercel.com) provides zero-configuration deployment for Node.js
applications. To use it now, it is as simple as configuring your `vercel.json`
file like the following:

```json
{
    "rewrites": [
        {
            "source": "/(.*)",
            "destination": "/api/serverless.js"
        }
    ]
}
```

Then, write `api/serverless.js` like so:

```js
"use strict";

// Read the .env file.
import * as dotenv from "dotenv";
dotenv.config();

// Require the framework
import Fastify from "fastify";

// Instantiate Fastify with some config
const app = Fastify({
  logger: true,
});

// Register your application as a normal plugin.
app.register(import("../src/app.js"));

export default async (req, res) => {
    await app.ready();
    app.server.emit('request', req, res);
}
```

In `src/app.js` define the plugin.
```js
async function routes (fastify, options) {
  fastify.get('/', async (request, reply) => {
    return { hello: 'world' }
  })
}

export default routes;
```