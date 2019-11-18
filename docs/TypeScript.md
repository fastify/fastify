<h1 align="center">Fastify</h1>

## TypeScript

The Fastify framework is written in plain JavaScript and as such type definitions are not as easy to maintain; however, since version 2 and beyond, maintainers and contributors have put in a great effort to improve the types.

In its current state, the type systems between Fastify v2.x and future v3.x contain breaking changes. Version 3.x type system introduces generic constraining and defaulting, plus a new way to define schema types such as a request body, querystring, and more! As the team works on improving framework and type definition synergy, sometimes parts of the API will not be typed or may be typed incorrectly. We encourage you to **contribute** to help us fill in the gaps. Just make sure to read our [`CONTRIBUTING.md`](https://github.com/fastify/fastify/blob/master/CONTRIBUTING.md) file before getting started to make sure things go smoothly! 

> The documentation in this section covers Fastify version 3.x typings

> Plugins may or may not include typings. See [Plugin Types](#plugin-types) for more information.

## Table of Contents
- [Learn By Example](#learn-by-example)
  * [Getting Started](#getting-started)
  * [Using Generics](#using-generics)
  * [Hooks & Middleware](#hooks--middleware)
  * [Plugins](#plugins)
- [API Type Documentation](#api-type-documentation)
  * [How to import](#how-to-import)
    + [fastify(opts?: FastifyOptions): FastifyInstance](#fastifyopts-fastifyoptions-fastifyinstance)
      - [Generics](#generics)
      - [Example 1: Standard HTTP server](#example-1-standard-http-server)
      - [Example 2: HTTPS/HTTP2 server](#example-2-httpshttp2-server)
      - [Example 3: Extended HTTP server](#example-3-extended-http-server)
      - [Example 4: Specifying logger types](#example-4-specifying-logger-types)
    + [fastify.FastifyServerOptions](#fastifyfastifyserveroptions)
    + [fastify.FastifyInstance](#fastifyfastifyinstance)
    + [fastify.FastifyRequest](#fastifyfastifyrequest)
    + [fastify.FastifyReply](#fastifyfastifyreply)
    + [fastify.FastifyPlugin](#fastifyfastifyplugin)
    + [fastify.FastifyPluginOptions](#fastifyfastifypluginoptions)
    + [fastify.FastifyLoggerOptions](#fastifyfastifyloggeroptions)
    + [fastify.FastifyLogFn](#fastifyfastifylogfn)
    + [fastify.LogLevels](#fastifyloglevels)
    + [fastify.FastifyMiddleware](#fastifyfastifymiddleware)
    + [fastify.FastifyMiddlewareWithPayload](#fastifyfastifymiddlewarewithpayload)
    + [fastify.FastifyContext](#fastifyfastifycontext)
    + [fastify.RouteHandlerMethod](#fastifyroutehandlermethod)
    + [fastify.RouteOptions](#fastifyrouteoptions)
    + [fastify.RouteShorthandMethod](#fastifyrouteshorthandmethod)
    + [fastify.RouteShorthandOptions](#fastifyrouteshorthandoptions)
    + [fastify.RouteShorthandOptionsWithHandler](#fastifyrouteshorthandoptionswithhandler)
    + [fastify.RegisterOptions](#fastifyregisteroptions)
    + [fastify.FastifyBodyParser](#fastifyfastifybodyparser)
    + [fastify.FastifyContentTypeParser](#fastifyfastifycontenttypeparser)
    + [fastify.AddContentTypeParser](#fastifyaddcontenttypeparser)
    + [fastify.hasContentTypeParser](#fastifyhascontenttypeparser)
    + [fastify.FastifyError](#fastifyfastifyerror)
    + [fastify.ValidationResult](#fastifyvalidationresult)
    + [fastify.FastifySchema](#fastifyfastifyschema)
    + [fastify.FastifySchemaCompiler](#fastifyfastifyschemacompiler)
    + [fastify.HTTPMethods](#fastifyhttpmethods)
    + [fastify.RawServerBase](#fastifyrawserverbase)
    + [fastify.RawRequestDefaultExpression](#fastifyrawrequestdefaultexpression)
    + [fastify.RawReplyDefaultExpression](#fastifyrawreplydefaultexpression)
    + [fastify.RawServerDefault](#fastifyrawserverdefault)
    + [fastify.onCloseHookHandler](#fastifyonclosehookhandler)
    + [fastify.onRouteHookHandler](#fastifyonroutehookhandler)
    + [fastify.onRequestHookHandler](#fastifyonrequesthookhandler)
    + [fastify.onSendHookHandler](#fastifyonsendhookhandler)
    + [fastify.onErrorHookHandler](#fastifyonerrorhookhandler)
    + [fastify.preHandlerHookHandler](#fastifyprehandlerhookhandler)
    + [fastify.preParsingHookHandler](#fastifypreparsinghookhandler)
    + [fastify.preSerializationHookHandler](#fastifypreserializationhookhandler)
    + [fastify.preValidationHookHandler](#fastifyprevalidationhookhandler)
    + [fastify.AddHook](#fastifyaddhook)
    + [fastify.addHookHandler](#fastifyaddhookhandler)
    + [fastify.FastifyServerFactory](#fastifyfastifyserverfactory)
    + [fastify.FastifyServerFactoryHandler](#fastifyfastifyserverfactoryhandler)

## Learn By Example

### Getting Started
- Create a new npm project, install Fastify, and install typescript & node.js types as peer dependencies:
  ```bash
  npm init -y
  npm i fastify
  npm i -D typescript @types/node
  ```
- Add the following lines to the `"scripts"` section of the `package.json`:
  ```json
  {
    "scripts": {
      "build": "tsc -p tsconfig.json",
      "start": "node index.js"
    }
  }
  ```
- Initialize a TypeScript configuration file:
  ```bash
  tsc --init
  ```
- Create an `index.ts` file - this will contain the server code
- Add the following code block to your file:
  ```typescript
  import fastify from 'fastify'

  const server = fastify()

  server.get('/ping', async (request, reply) => {
    await reply.send('pong\n')
  })

  server.listen(8080, (err, address) => {
    if(err) {
      console.error(err)
      process.exit(0)
    }
    console.log(`Server listening at ${address}`)
  })
  ```
- Run `npm run build` - this will compile `index.ts` into `index.js` which can be executed using Node.js. If you run into any errors please open an issue in [fastify/help](https://github.com/fastify/help/)
- Run `npm run start` to run the Fastify server
- You should see `Server listening at http://127.0.0.1:8080` in your console
- Try out your server using `curl localhost:8080/ping`, it should return `pong` 🏓

🎉 You now have a working Typescript Fastify server! This example demonstrates the simplicity of the version 3.x type system. By default, the type system assumes you are using an `http` server. The later examples will demonstrate how to create more complex servers such as `https` and `http2`, how to specify route schemas, and more!

### Using Generics

### Hooks & Middleware

### Plugins

## API Type System Documentation

This section is a detailed account of all the types available to you in Fastify version 3.x

All `http`, `https`, and `http2` types are inferred from `@types/node`

Generics are documented by their default value as well as their constraint value(s). Read these articles for more information on TypeScript generics.
- [Generic Parameter Default](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html#generic-parameter-defaults)
- [Generic Constraints](https://www.typescriptlang.org/docs/handbook/generics.html#generic-constraints)

Find detailed documentation on the generics used for this type system in the main [fastify]() api method and the [FastifyMiddleware]() section

### How to import

The Fastify API is powered by the `fastify()` method. In JavaScript you would import it using `const fastify = require('fastify')`. In TypeScript it is recommended to use the `import/from` syntax instead so types can be resolved. There are a couple supported import methods with the Fastify type system.

1. `import fastify from 'fastify'`
    - Types are resolved but not accessible using dot notation
    - Example:
    ```typescript
    import fastify from 'fastify'

    const f = fastify()
    f.listen(8080, () => { console.log('running') })
    ```
    - Gain access to types with destructuring:
    ```typescript
    import fastify, { FastifyInstance } from 'fastify'

    const f: FastifyInstance = fastify()
    f.listen(8080, () => { console.log('running') })
    ```
    - Destructuring also works for the main API method:
    ```typescript
    import { fastify, FastifyInstance } from 'fastify'

    const f: FastifyInstance = fastify()
    f.listen(8080, () => { console.log('running') })
    ```
2. `import * as Fastify from 'fastify'`
    - Types are resolved and accessible using dot notation
    - Calling the main Fastify API method requires a slightly different syntax (see example)
    - Example:
    ```typescript
    import * as Fastify from 'fastify'

    const f: Fastify.FastifyInstance = Fastify.fastify()
    f.listen(8080, () => { console.log('running') })
    ```
3. `const fastify = require('fastify')`
    - This syntax is valid and will import fastify as expected; however, types will **not** be resolved
    - Example:
    ```typescript
    const fastify = require('fastify')

    const f = fastify()
    f.listen(8080, () => { console.log('running') })
    ```
    - Destructuring is still supported, but will also not resolve types
    ```typescript
    const { fastify } = require('fastify')

    const f = fastify()
    f.listen(8080, () => { console.log('running') })
    ```

#### fastify<RawServer, RawRequest, RawReply, Logger>(opts?: FastifyOptions): FastifyInstance

The main Fastify API method. By default creates an HTTP server. Supports an extensive generic type system to either specify the server as HTTPS/HTTP2, or allow the user to extend the underlying Node.js Server, Request, and Reply objects. Additionally, the `Logger` generic exists for custom log types. See the examples and generic breakdown below for more information.

##### Generics
- RawServer - Underlying Node.js server type
  - Default: `http.Server`
  - Constraints: `http.Server`, `https.Server`, `http2.Http2Server`, `http2.Http2SecureServer`
  - Enforces: `RawRequest`, `RawReply`
- RawRequest - Underlying Node.js request type - _enforced by RawServer_
  - Default: `RawServer extends http.Server | https.Server ? http.IncomingMessage : http2.Http2ServerRequest`
  - Constraints: `http.IncomingMessage`, `http2.Http2ServerRequest`
- RawReply - Underlying Node.js response type - _enforced by RawServer_
  - Default: `RawServer extends http.Server | https.Server ? http.ServerResponse : http2.Http2ServerResponse`
  - Constraints: `http.ServerResponse`, `http2.Http2ServerResponse`
- Logger - Fastify logging utility - _enforced by RawServer_
  - Default: [`FastifyLoggerOptions<RawServer>`](#fastifyloggeroptions)

##### Example 1: Standard HTTP server

No need to specify the `Server` generic as the type system defaults to HTTP.
```typescript
import fastify from 'fastify'

const server = fastify()
```

##### Example 2: HTTPS/HTTP2 server

In order to use HTTPS or HTTP2, import the appropriate type system from `@types/node` and pass it to the first generic parameter.
```typescript
import fastify from 'fastify'
import http2 from 'http2'

const http2FastifyServer = fastify<http2.Http2Server>({ https: true })
```

##### Example 3: Extended HTTP server

Not only can you specify the server type, but also the request and reply types. Thus, allowing you to specify special properties, methods, and more! When specified at server instantiation, the custome type becomes available on all further instances of the custom type.
```typescript
import fastify from 'fastify'
import http from 'http'

interface customRequest extends http.IncomingMessage {
  mySpecialProp: string
}

const server = fastify<http.Server, customRequest>()

server.get('/', async (request, reply) => {
  const someValue = request.mySpecialProp // TS knows this is a string, because of the `customRequest` interface
  return someValue.toUpperCase()
})
```

##### Example 4: Specifying logger types

Fastify uses the [Pino]() logging library under the hood. While the Fastify type system does provide the neecessary types for you to use the included logger, if you'd like the specificity of the Pino types install them from `@types/pino` and pass the `pino.Logger` type to the fourth generic parameter. This generic also supports custom logging utilities such as creating custom serializers. See the [Logging]() documentation for more info.

```typescript
import fastify from 'fastify'
import http from 'http'
import pino from 'pino'

const server = fastify<http.Server, http.IncomingMessage, http.ServerResponse, pino.Logger>({
  logger: true
})

server.get('/', async (request, reply) => {
  server.log.info('log message')
  return 'another message'
})
```

#### fastify.FastifyServerOptions

#### fastify.FastifyInstance

#### fastify.FastifyRequest

#### fastify.FastifyReply

#### fastify.FastifyPlugin

#### fastify.FastifyPluginOptions

#### fastify.FastifyLoggerOptions

#### fastify.FastifyLogFn

#### fastify.LogLevels

#### fastify.FastifyMiddleware

#### fastify.FastifyMiddlewareWithPayload

#### fastify.FastifyContext

#### fastify.RouteHandlerMethod

#### fastify.RouteOptions

#### fastify.RouteShorthandMethod

#### fastify.RouteShorthandOptions

#### fastify.RouteShorthandOptionsWithHandler

#### fastify.RegisterOptions

#### fastify.FastifyBodyParser

#### fastify.FastifyContentTypeParser

#### fastify.AddContentTypeParser

#### fastify.hasContentTypeParser

#### fastify.FastifyError

#### fastify.ValidationResult

#### fastify.FastifySchema

#### fastify.FastifySchemaCompiler

#### fastify.HTTPMethods

#### fastify.RawServerBase

#### fastify.RawRequestDefaultExpression

#### fastify.RawReplyDefaultExpression

#### fastify.RawServerDefault

#### fastify.onCloseHookHandler

#### fastify.onRouteHookHandler

#### fastify.onRequestHookHandler

#### fastify.onSendHookHandler

#### fastify.onErrorHookHandler

#### fastify.preHandlerHookHandler

#### fastify.preParsingHookHandler

#### fastify.preSerializationHookHandler

#### fastify.preValidationHookHandler

#### fastify.AddHook

#### fastify.addHookHandler

#### fastify.FastifyServerFactory

#### fastify.FastifyServerFactoryHandler
