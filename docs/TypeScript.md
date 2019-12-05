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

The best way to learn the Fastify type system is by example! The following four examples should cover the most common Fastify development cases. After the examples there is further, more detailed documentation for the type system. 

### Getting Started

This example will get you up and running with Fastify and TypeScript. It results in a blank http Fastify server. 

1. Create a new npm project, install Fastify, and install typescript & node.js types as peer dependencies:
  ```bash
  npm init -y
  npm i fastify
  npm i -D typescript @types/node
  ```
2. Add the following lines to the `"scripts"` section of the `package.json`:
  ```json
  {
    "scripts": {
      "build": "tsc -p tsconfig.json",
      "start": "node index.js"
    }
  }
  ```
3. Initialize a TypeScript configuration file:
  ```bash
  ./node_modules/typescript/bin/tsc --init
  ```
4. Create an `index.ts` file - this will contain the server code
5. Add the following code block to your file:
  ```typescript
  import fastify from 'fastify'

  const server = fastify()

  server.get('/ping', async (request, reply) => {
    return 'pong\n'
  })

  server.listen(8080, (err, address) => {
    if(err) {
      console.error(err)
      process.exit(0)
    }
    console.log(`Server listening at ${address}`)
  })
  ```
6. Run `npm run build` - this will compile `index.ts` into `index.js` which can be executed using Node.js. If you run into any errors please open an issue in [fastify/help](https://github.com/fastify/help/)
7. Run `npm run start` to run the Fastify server
8. You should see `Server listening at http://127.0.0.1:8080` in your console
9. Try out your server using `curl localhost:8080/ping`, it should return `pong` 🏓

🎉 You now have a working Typescript Fastify server! This example demonstrates the simplicity of the version 3.x type system. By default, the type system assumes you are using an `http` server. The later examples will demonstrate how to create more complex servers such as `https` and `http2`, how to specify route schemas, and more!

> For more examples on initializing Fastify with TypeScript (such as enabling HTTP2) check out the detailed API section [here]((#fastifyopts-fastifyoptions-fastifyinstance))

### Using Generics

The type system heavily relies on generic properties to provide the most accurate development experience. While some may find the overhead a bit cumbersome, the tradeoff is worth it! This example will dive into implementing generic types for route schemas and the dynamic properties located on the route-level `request` object.

1. If you did not complete the previous example, follow steps 1-4 to get set up.
2. Inside `index.ts`, define two interfaces `IQuerystring` and `IHeaders`:
    ```typescript
    interface IQuerystring {
      username: string;
      password: string;
    }

    interface IHeaders {
      'H-Custom': string;
    }
    ```
3. Using the two interfaces, define a new API route and pass them as generics. The shorthand route methods (i.e. `.get`) accept a generic object `RequestGenericInterface` containing four named properties: `Body`, `Querystring`, `Params`, and `Headers`. The interfaces will be passed down through the route method into the route method handler `request` instance. 
    ```typescript
    server.get<{ 
      Querystring: IQuerystring,
      Headers: IHeaders
    }>('/auth', async (request, reply) => {
      const { username, password } = request.query
      const customerHeader = request.headers['H-Custom']
      // do something with request data

      return `logged in!`
    }) 
    ```
4. Build and run the server code with `npm run build` and `npm run start`
5. Query the api
    ```bash
    curl localhost:8080/auth?username=admin&password=Password123!
    ```
    And it should return back `logged in!`
6. But wait theres more! The generic interfaces are also available inside route level hook methods. Modify the previous route by adding a `preValidation` hook:
    ```typescript
    server.get<{ 
      Querystring: IQuerystring,
      Headers: IHeaders
    }>('/auth', {
      preValidation: (request, reply) => {
        const { username, password } = request.query
        done(username !== 'admin' ? new Error('Must be admin') : undefined) // only validate `admin` account
      }
    }, async (request, reply) => {
      const customerHeader = request.headers['H-Custom']
      // do something with request data
      return `logged in!`
    }) 
    ```
7. Build and run and query with the `username` query string option set to anything other than `admin`. The API should now return a HTTP 500 error `{"statusCode":500,"error":"Internal Server Error","message":"Must be admin"}`

🎉 Good work, now you can define interfaces for each route and have strictly typed request and reply instances. Other parts of the Fastify type system rely on generic properties. Make sure to reference the detailed type system documentation below to learn more about what is available.

### JSON Schema

In the last example we used interfaces to define the types for the request querystring and headers. Many users will already be using JSON Schemas to define these properties, and luckily there is a way to transform existing JSON Schemas into TypeScript interfaces!

1. If you did not complete the 'Getting Started' example, go back and follow steps 1-4 first.
2. Install the `json-schema-to-typescript` module:
    ```
    npm i -D json-schema-to-typescript
    ```
3. Create a new folder called `schemas` and add two files `params.json` and `querystring.json`. Copy and paste the following schema definitions into the respective files:
    ```json
    {
      "title": "Params Schema",
      "type": "object",
      "properties": {
        "fuzz": { "type": "string" },
        "buzz": { "type": "integer" }
      },
      "additionalProperties": false,
      "required": ["buzz"]
    }
    ```
    ```json
    {
      "title": "Querystring Schema",
      "type": "object",
      "properties": {
        "foo": { "type": "string" },
        "bar": { "type": "integer" }
      },
      "additionalProperties": false,
      "required": ["foo"]
    }
    ```
4. Create a new folder `types`, leave it empty. Create a new file in the root of your project called `compileSchemaTypes.ts` and copy/paste the following code:
    ```typescript
    import path from 'path'
    import _fs from 'fs'
    const fs = _fs.promises
    import { compileFromFile } from 'json-schema-to-typescript'

    const fileOutputPath = (file: string) => {
      return path.join(__dirname, '/types', `${path.basename(file, '.json')}.d.ts`)
    }

    const compileSchemas = async () => {
      try {
        const files = await fs.readdir(path.join(__dirname, '/schemas'))
        for (var file of files) {
          if (path.extname(file) === '.json') {
            const ts = await compileFromFile(path.join(__dirname, '/schemas', file))
            await fs.writeFile(fileOutputPath(file), ts)
          }
        }
      } catch (error) {
        console.error(error)
      }
    }

    compileSchemas()
    ```
    This function loops over the JSON Schemas and uses the `json-schema-to-typescript` library to compile them into type definition files.
5. Run `npm run build` then `node compileSchemaTypes.js`. Two new files should have been created in the `types` directory.
6. Update `index.ts` to have the following code:
    ```typescript
    import fastify from 'fastify'

    // import json schemas as normal
    import querystringSchema from './schemas/querystring.json'
    import paramsSchema from './schemas/params.json'

    // import the generated interfaces
    import { QuerystringSchema } from './types/querystring'
    import { ParamsSchema } from './types/params'

    const server = fastify()

    server.get<{
      Querystring: QuerystringSchema,
      Params: ParamsSchema
    }>(
      '/',
      {
        schema: {
          querystring: querystringSchema,
          params: paramsSchema
        }
      },
      async (req, res) => {
        const { foo } = req.query
        const { buzz } = req.params
        return `${foo}: ${buzz}`
      }
    )

    server.listen(8080, (err, address) => {
      if(err) {
        console.error(err)
        process.exit(0)
      }
      console.log(`Server listening at ${address}`)
    })
    ```
    Pay special attention to the imports at the top of this file. It might seem redundant, but you need to import both the schema files and the generated interfaces.

Great work! Now you can make use of both JSON Schemas and TypeScript definitions. If you didn't know already, defining schemas for your Fastify routes can increase their throughput! Check out the [Validation and Serialization](./Validation-and-Serialization.md) documenation for more info.

Some additional notes:
  - There is an open [pull request](https://github.com/bcherny/json-schema-to-typescript/pull/238) on `json-schema-to-typescript` to add the directory support we implemented in step 4. When it is merged, updates will be made to this documentation.
  - Currently, there is no type definition support for inline JSON schemas. If you can come up with a solution please open a PR!

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
