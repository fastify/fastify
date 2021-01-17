<h1 align="center">Serverless</h1>

Run serverless applications and REST APIs using your existing Fastify application.

### Contents

- [AWS Lambda](#aws-lambda)
- [Google Cloud Run](#google-cloud-run)
- [Netlify Lambda](#netlify-lambda)
- [Vercel](#vercel)

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

if (require.main === module) {
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

## Google Cloud Run

Unlike AWS Lambda or Google Cloud Functions, Google Cloud Run is a serverless **container** environment. It's primary purpose is to provide an infrastructure-abstracted environment to run arbitrary containers. As a result, Fastify can be deployed to Google Cloud Run with little-to-no code changes from the way you would write your Fastify app normally.

*Follow the steps below to deploy to Google Cloud Run if you are already familiar with gcloud or just follow their [quickstart](https://cloud.google.com/run/docs/quickstarts/build-and-deploy)*.

### Adjust Fastify server

In order for Fastify to properly listen for requests within the container, be sure to set the correct port and address:

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
  const address = IS_GOOGLE_CLOUD_RUN ? "0.0.0.0" : undefined

  try {
    const server = build()
    const address = await server.listen(port, address)
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

Next, submit your app to be built into a Docker image by running the following command (replacing `PROJECT-ID` and `APP-NAME` with your GCP project id and an app name):

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

First, please do all preparation steps related to **AWS Lambda**.

Create folder called `functions` then create `server.js` (and your endpoint path will be `server.js`) inside `functions` folder.

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

**Don't forget add this Webpack config, else a lot of problems can occur**

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

[Vercel](https://vercel.com) provides zero configuration deployment for
Node.js applications. In order to use now, it is as simple as
configuring your `now.json` file like the following:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/serverless.js",
      "use": "@now/node",
      "config": {
        "helpers": false
      }
    }
  ],
  "routes": [
    { "src": "/.*", "dest": "/api/serverless.js"}
  ]
}
```

Then, write a `api/serverless.js` like so:

```js
'use strict'

const build = require('./index')

const app = build()

module.exports = async function (req, res) {
  await app.ready()
  app.server.emit('request', req, res)
}
```

And a `api/index.js` file:

```js
'use strict'

const fastify = require('fastify')

function build () {
  const app = fastify({
    logger: true
  })

  app.get('/', async (req, res) => {
    const { name = 'World' } = req.query
    req.log.info({ name }, 'hello world!')
    return `Hello ${name}!`
  })

  return app
}

module.exports = build
```

Note that you'll need to use Node 10 by setting it in `package.json`:

```js
  "engines": {
    "node": "10.x"
  },
```
