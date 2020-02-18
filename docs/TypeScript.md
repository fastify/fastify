<h1 align="center">Fastify</h1>

<a id="typescript"></a>
## TypeScript
Fastify is shipped with a typings file, but you may need to install `@types/node`, depending on the Node.js version you are using.

## Types support
We do care about the TypeScript community, and one of our core team members is currently reworking all types.
We do our best to have the typings updated with the latest version of the API, but *it can happen* that the typings are not in sync.<br/>
Luckily this is Open Source and you can contribute to fix them, we will be very happy to accept the fix and release it as soon as possible as a patch release. Checkout the [contributing](#contributing) rules!

Plugins may or may not include typings. See [Plugin Types](#plugin-types) for more information.

## Example
This example TypeScript app closely aligns with the JavaScript examples:

```ts
import * as fastify from 'fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'

// Create a http server. We pass the relevant typings for our http version used.
// By passing types we get correctly typed access to the underlying http objects in routes.
// If using http2 we'd pass <http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse>
// For https pass http2.Http2SecureServer or http.SecureServer instead of Server.
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

server.get<Query, Params, Headers, Body>('/ping/:bar', opts, (request, reply) => {
  console.log(request.query) // this is of type Query!
  console.log(request.params) // this is of type Params!
  console.log(request.headers) // this is of type Headers!
  console.log(request.body) // this is of type Body!
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
  console.log(request.headers) // this is of type unknown!
  console.log(request.body) // this is of type fastify.DefaultBody because typescript will use the default type value!
  reply.code(200).send({ pong: 'it worked!' })
})

// Given that you haven't validated the querystring, body, or headers, it would be best
// to type those params as 'unknown'. However, it's up to you. The example below is the
// best way to prevent you from shooting yourself in the foot. In other words, don't
// use values you haven't validated.
server.get<unknown, Params, unknown, unknown>('/ping/:bar', opts, (request, reply) => {
  console.log(request.query) // this is of type unknown!
  console.log(request.params) // this is of type Params!
  console.log(request.headers) // this is of type unknown!
  console.log(request.body) // this is of type unknown!
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

* [`Core`](#core-types) - The typings bundled with fastify
* [`Plugins`](#plugin-types) - Fastify ecosystem plugins

Make sure to read our [`CONTRIBUTING.md`](https://github.com/fastify/fastify/blob/master/CONTRIBUTING.md) file before getting started to make sure things go smoothly!

<a id="core-types"></a>
### Core Types
When updating core types you should make a PR to this repository. Ensure you:

1. Update `examples/typescript-server.ts` to reflect the changes (if necessary)
2. Update `test/types/index.ts` to validate changes work as expected

<a id="plugin-types"></a>
### Plugin Types

Plugins maintained by and organized under the fastify organization on GitHub should ship with typings just like fastify itself does.
Some plugins already include typings but many do not. We are happy to accept contributions to those plugins without any typings, see [fastify-cors](https://github.com/fastify/fastify-cors) for an example of a plugin that comes with it's own typings.

Typings for third-party-plugins may either be included with the plugin or hosted on DefinitelyTyped. Remember, if you author a plugin to either include typings or publish them on DefinitelyTyped! Information  of how to install typings from DefinitelyTyped can be found [here](https://github.com/DefinitelyTyped/DefinitelyTyped#npm).

Some types might not be available yet, so don't be shy about contributing.

<a id="authoring-plugin-types"></a>
### Authoring Plugin Types
Typings for many plugins that extend the `FastifyRequest`, `FastifyReply` or `FastifyInstance` objects can be achieved as shown below.

This code shows the typings for the [`fastify-static`](https://github.com/fastify/fastify-static) plugin.

```ts
/// <reference types="node" />

// require fastify typings
import * as fastify from 'fastify';

// require necessary http, http2, https typings
import { Server, IncomingMessage, ServerResponse } from "http";
import { Http2SecureServer, Http2Server, Http2ServerRequest, Http2ServerResponse } from "http2";
import * as https from "https";

type HttpServer = Server | Http2Server | Http2SecureServer | https.Server;
type HttpRequest = IncomingMessage | Http2ServerRequest;
type HttpResponse = ServerResponse | Http2ServerResponse;

// extend fastify typings
declare module "fastify" {
  interface FastifyReply<HttpResponse> {
    sendFile(filename: string): FastifyReply<HttpResponse>;
  }
}

// declare plugin type using fastify.Plugin
declare function fastifyStatic(): fastify.Plugin<
  Server,
  IncomingMessage,
  ServerResponse,
  {
    root: string;
    prefix?: string;
    serve?: boolean;
    decorateReply?: boolean;
    schemaHide?: boolean;
    setHeaders?: (...args: any[]) => void;
    redirect?: boolean;
    wildcard?: boolean | string;

    // Passed on to `send`
    acceptRanges?: boolean;
    cacheControl?: boolean;
    dotfiles?: boolean;
    etag?: boolean;
    extensions?: string[];
    immutable?: boolean;
    index?: string[];
    lastModified?: boolean;
    maxAge?: string | number;
  }
>;

declare namespace fastifyStatic {
  interface FastifyStaticOptions {}
}

// export plugin type
export = fastifyStatic;
```

Now you are good to go and could use the plugin like so:

```ts
import * as Fastify from 'fastify'
import * as fastifyStatic from 'fastify-static'

const app = Fastify()

// the options here are type-checked
app.register(fastifyStatic, {
  acceptRanges: true,
  cacheControl: true,
  decorateReply: true,
  dotfiles: true,
  etag: true,
  extensions: ['.js'],
  immutable: true,
  index: ['1'],
  lastModified: true,
  maxAge: '',
  prefix: '',
  root: '',
  schemaHide: true,
  serve: true,
  setHeaders: (res, pathName) => {
    res.setHeader('some-header', pathName)
  }
})

app.get('/file', (request, reply) => {
  // using newly defined function on FastifyReply
  reply.sendFile('some-file-name')
})
```

Adding typings to all our plugins is a community effort so feel free to contribute!
