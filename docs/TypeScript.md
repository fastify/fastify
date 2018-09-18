<h1 align="center">Fastify</h1>

<a id="typescript"></a>
## TypeScript
Fastify is shipped with a typings file, but it still require to install `@types/node`, depending on the Node.js version that you are using.

## Types support
We do care about the TypeScript community, but the framework is written in plain JavaScript and currently no one of the core team is a TypeScript user while only one of the collaborators is.
We do our best to have the typing updated with the latest version of the API, but *it can happen* that the typings are not in sync.<br/>
Luckly this is Open Source and you can contribute to fix them, we will be very happy to accept the fix and release it as soon as possible as a patch release. Checkout the [contributing](#contributing) rules!

Plugins may or may not include typings. See [Plugin Types](#plugin-types) for more information.

## Example
This example TypeScript app closely aligns with the JavaScript examples:

```ts
import * as fastify from 'fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'

// Create a http server. We pass the relevant typings for our http version used.
// By passing types we get correctly typed access to the underlying http objects in routes.
// If using http2 we'd pass <http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse>
const server: fastify.FastifyInstance<Server, IncomingMessage, ServerResponse> = fastify({})

const opts: fastify.RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          pong: {
            type: 'string'
          }
        }
      }
    }
  }
}

server.get('/ping', opts, (request, reply) => {
  console.log(reply.res) // this is the http.ServerResponse with correct typings!
  reply.code(200).send({ pong: 'it worked!' })
})
```

<a id="generic-parameters"></a>
## Generic Parameters
Since you can validate the querystring, params, body, and headers, you can also override the default types of those values on the request interface:

```ts
import * as fastify from 'fastify'

const server = fastify({})

interface Query {
  foo?: number
}

interface Params {
  bar?: string
}

interface Body {
  baz?: string
}

interface Headers {
  a?: string
}

const opts: fastify.RouteShorthandOptions = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        foo: {
          type: 'number'
        }
      }
    },
    params: {
      type: 'object',
      properties: {
        bar: {
          type: 'string'
        }
      }
    },
    body: {
      type: 'object',
      properties: {
        baz: {
          type: 'string'
        }
      }
    },
    headers: {
      type: 'object',
      properties: {
        a: {
          type: 'string'
        }
      }
    }
  }
}

server.get<Query, Params, Body, Headers>('/ping/:bar', opts, (request, reply) => {
  console.log(request.query) // this is of type Query!
  console.log(request.params) // this is of type Params!
  console.log(request.body) // this is of type Body!
  console.log(request.headers) // this is of type Headers!
  reply.code(200).send({ pong: 'it worked!' })
})
```

All generic types are optional, so you can also pass types for the parts you validate with schemas:

```ts
import * as fastify from 'fastify'

const server = fastify({})

interface Params {
  bar?: string
}

const opts: fastify.RouteShorthandOptions = {
  schema: {
    params: {
      type: 'object',
      properties: {
        bar: {
          type: 'string'
        }
      }
    },
  }
}

server.get<fastify.DefaultQuery, Params, unknown>('/ping/:bar', opts, (request, reply) => {
  console.log(request.query) // this is of type fastify.DefaultQuery!
  console.log(request.params) // this is of type Params!
  console.log(request.body) // this is of type unknown!
  console.log(request.headers) // this is of type fastify.DefaultHeader because typescript will use the default type value!
  reply.code(200).send({ pong: 'it worked!' })
})

// Given that you haven't validated the querystring, body, or headers, it would be best
// to type those params as 'unknown'. However, it's up to you. The example below is the
// best way to prevent you from shooting yourself in the foot. In other words, don't
// use values you haven't validated.
server.get<unknown, Params, unknown, unknown>('/ping/:bar', opts, (request, reply) => {
  console.log(request.query) // this is of type unknown!
  console.log(request.params) // this is of type Params!
  console.log(request.body) // this is of type unknown!
  console.log(request.headers) // this is of type unknown!
  reply.code(200).send({ pong: 'it worked!' })
})
```

<a id="http-prototypes"></a>
## HTTP Prototypes
By default, fastify will determine which version of http is being used based on the options you pass to it. If for any
reason you need to override this you can do so as shown below:

```ts
interface CustomIncomingMessage extends http.IncomingMessage {
  getClientDeviceType: () => string
}

// Passing overrides for the http prototypes to fastify
const server: fastify.FastifyInstance<http.Server, CustomIncomingMessage, http.ServerResponse> = fastify()

server.get('/ping', (request, reply) => {
  // Access our custom method on the http prototype
  const clientDeviceType = request.raw.getClientDeviceType()

  reply.send({ clientDeviceType: `you called this endpoint from a ${clientDeviceType}` })
})
```

In this example we pass a modified `http.IncomingMessage` interface since it has been extended elsewhere in our
application.


<a id="contributing"></a>
## Contributing
TypeScript related changes can be considered to fall into one of two categories:

* Core - The typings bundled with fastify
* Plugins - Fastify ecosystem plugins

Make sure to read our [`CONTRIBUTING.md`](https://github.com/fastify/fastify/blob/master/CONTRIBUTING.md) file before getting started to make sure things go smoothly!

<a id="core-types"></a>
### Core Types
When updating core types you should make a PR to this repository. Ensure you:

1. Update `examples/typescript-server.ts` to reflect the changes (if necessary)
2. Update `test/types/index.ts` to validate changes work as expected

<a id="plugin-types"></a>
### Plugin Types

Typings for plugins are hosted in DefinitelyTyped. This means when using plugins you should install like so:

```
npm install fastify-url-data @types/fastify-url-data
```

After this you should be good to go. Some types might not be available yet, so don't be shy about contributing.

<a id="authoring-plugin-types"></a>
### Authoring Plugin Types
Typings for many plugins that extend the `FastifyRequest` and `FastifyReply` objects can be achieved as shown below.

This code demonstrates adding types for `fastify-url-data` to your application.

```ts
// filename: custom-types.d.ts

// Core typings and values
import fastify = require('fastify');

// Extra types that will be used for plugin typings
import { UrlObject } from 'url';

// Extend FastifyReply with the "fastify-url-data" plugin
declare module 'fastify' {
  interface FastifyRequest {
    urlData (): UrlObject
  }
}

declare function urlData (): void

declare namespace urlData {}

export = urlData;
```

Now you can use `fastify-url-data` like so:

```ts
import * as fastify from 'fastify'
import * as urlData from 'fastify-url-data'

/// <reference types="./custom-types.d.ts"/>

const server = fastify();

server.register(urlData)

server.get('/data', (request, reply) => {
  console.log(request.urlData().auth)
  console.log(request.urlData().host)
  console.log(request.urlData().port)
  console.log(request.urlData().query)

  reply.send({msg: 'ok'})
})

server.listen(3030)
```

Remember, if you author typings for a plugin you should publish them to DefinitelyTyped!
