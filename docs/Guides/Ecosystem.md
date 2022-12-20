<h1 align="center">Fastify</h1>

## Ecosystem

Plugins maintained by the Fastify team are listed under [Core](#core) while
plugins maintained by the community are listed in the [Community](#community)
section.

#### [Core](#core)

- [`@fastify/accepts`](https://github.com/fastify/fastify-accepts) to have
  [accepts](https://www.npmjs.com/package/accepts) in your request object.
- [`@fastify/accepts-serializer`](https://github.com/fastify/fastify-accepts-serializer)
  to serialize to output according to `Accept` header.
- [`@fastify/any-schema`](https://github.com/fastify/any-schema-you-like) Save
  multiple schemas and decide which one to use to serialize the payload
- [`@fastify/auth`](https://github.com/fastify/fastify-auth) Run multiple auth
  functions in Fastify.
- [`@fastify/autoload`](https://github.com/fastify/fastify-autoload) Require all
  plugins in a directory.
- [`@fastify/awilix`](https://github.com/fastify/fastify-awilix) Dependency
  injection support for Fastify, based on
  [awilix](https://github.com/jeffijoe/awilix).
- [`@fastify/aws-lambda`](https://github.com/fastify/aws-lambda-fastify) allows
  you to easily build serverless web applications/services and RESTful APIs
  using Fastify on top of AWS Lambda and Amazon API Gateway.
- [`@fastify/basic-auth`](https://github.com/fastify/fastify-basic-auth) Basic
  auth plugin for Fastify.
- [`@fastify/bearer-auth`](https://github.com/fastify/fastify-bearer-auth)
  Bearer auth plugin for Fastify.
- [`@fastify/caching`](https://github.com/fastify/fastify-caching) General
  server-side cache and ETag support.
- [`@fastify/circuit-breaker`](https://github.com/fastify/fastify-circuit-breaker)
  A low overhead circuit breaker for your routes.
- [`@fastify/compress`](https://github.com/fastify/fastify-compress) Fastify
  compression utils.
- [`@fastify/cookie`](https://github.com/fastify/fastify-cookie) Parse and set
  cookie headers.
- [`@fastify/cors`](https://github.com/fastify/fastify-cors) Enables the use of
  CORS in a Fastify application.
- [`@fastify/csrf-protection`](https://github.com/fastify/csrf-protection) A
  plugin for adding
  [CSRF](https://en.wikipedia.org/wiki/Cross-site_request_forgery) protection to
  Fastify.
- [`@fastify/diagnostics-channel`](https://github.com/fastify/fastify-diagnostics-channel)
  Plugin to deal with `diagnostics_channel` on Fastify
- [`@fastify/elasticsearch`](https://github.com/fastify/fastify-elasticsearch)
  Plugin to share the same ES client.
- [`@fastify/env`](https://github.com/fastify/fastify-env) Load and check
  configuration.
- [`@fastify/etag`](https://github.com/fastify/fastify-etag) Automatically
  generate ETags for HTTP responses.
- [`@fastify/flash`](https://github.com/fastify/fastify-flash) Set and get flash
  messages using the session.
- [`@fastify/formbody`](https://github.com/fastify/fastify-formbody) Plugin to
  parse x-www-form-urlencoded bodies.
- [`@fastify/funky`](https://github.com/fastify/fastify-funky) Makes functional
  programming in Fastify more convenient. Adds support for Fastify routes
  returning functional structures, such as Either, Task or plain parameterless
  function.
- [`@fastify/helmet`](https://github.com/fastify/fastify-helmet) Important
  security headers for Fastify.
- [`@fastify/hotwire`](https://github.com/fastify/fastify-hotwire) Use the
  Hotwire pattern with Fastify.
- [`@fastify/http-proxy`](https://github.com/fastify/fastify-http-proxy) Proxy
  your HTTP requests to another server, with hooks.
- [`@fastify/jwt`](https://github.com/fastify/fastify-jwt) JWT utils for
  Fastify, internally uses [fast-jwt](https://github.com/nearform/fast-jwt).
- [`@fastify/leveldb`](https://github.com/fastify/fastify-leveldb) Plugin to
  share a common LevelDB connection across Fastify.
- [`@fastify/middie`](https://github.com/fastify/middie) Middleware engine for
  Fastify.
- [`@fastify/mongodb`](https://github.com/fastify/fastify-mongodb) Fastify
  MongoDB connection plugin, with which you can share the same MongoDB
  connection pool across every part of your server.
- [`@fastify/multipart`](https://github.com/fastify/fastify-multipart) Multipart
  support for Fastify.
- [`@fastify/nextjs`](https://github.com/fastify/fastify-nextjs) React
  server-side rendering support for Fastify with
  [Next](https://github.com/zeit/next.js/).
- [`@fastify/oauth2`](https://github.com/fastify/fastify-oauth2) Wrap around
  [`simple-oauth2`](https://github.com/lelylan/simple-oauth2).
- [`@fastify/one-line-logger`](https://github.com/fastify/one-line-logger) Formats
  Fastify's logs into a nice one-line message.
- [`@fastify/postgres`](https://github.com/fastify/fastify-postgres) Fastify
  PostgreSQL connection plugin, with this you can share the same PostgreSQL
  connection pool in every part of your server.
- [`@fastify/rate-limit`](https://github.com/fastify/fastify-rate-limit) A low
  overhead rate limiter for your routes.
- [`@fastify/redis`](https://github.com/fastify/fastify-redis) Fastify Redis
  connection plugin, with which you can share the same Redis connection across
  every part of your server.
- [`@fastify/reply-from`](https://github.com/fastify/fastify-reply-from) Plugin
  to forward the current HTTP request to another server.
- [`@fastify/request-context`](https://github.com/fastify/fastify-request-context)
  Request-scoped storage, based on
  [AsyncLocalStorage](https://nodejs.org/api/async_hooks.html#async_hooks_class_asynclocalstorage)
  (with fallback to [cls-hooked](https://github.com/Jeff-Lewis/cls-hooked)),
  providing functionality similar to thread-local storages.
- [`@fastify/response-validation`](https://github.com/fastify/fastify-response-validation)
  A simple plugin that enables response validation for Fastify.
- [`@fastify/routes`](https://github.com/fastify/fastify-routes) Plugin that
  provides a `Map` of routes.
- [`@fastify/schedule`](https://github.com/fastify/fastify-schedule) Plugin for
  scheduling periodic jobs, based on
  [toad-scheduler](https://github.com/kibertoad/toad-scheduler).
- [`@fastify/secure-session`](https://github.com/fastify/fastify-secure-session)
  Create a secure stateless cookie session for Fastify.
- [`@fastify/sensible`](https://github.com/fastify/fastify-sensible) Defaults
  for Fastify that everyone can agree on. It adds some useful decorators such as
  HTTP errors and assertions, but also more request and reply methods.
- [`@fastify/session`](https://github.com/fastify/session) a session plugin for
  Fastify.
- [`@fastify/soap-client`](https://github.com/fastify/fastify-soap-client) a SOAP
  client plugin for Fastify.
- [`@fastify/static`](https://github.com/fastify/fastify-static) Plugin for
  serving static files as fast as possible.
- [`@fastify/swagger`](https://github.com/fastify/fastify-swagger) Plugin for
  serving Swagger/OpenAPI documentation for Fastify, supporting dynamic
  generation.
- [`@fastify/type-provider-json-schema-to-ts`](https://github.com/fastify/fastify-type-provider-json-schema-to-ts)
  Fastify
  [type provider](https://www.fastify.io/docs/latest/Reference/Type-Providers/)
  for [json-schema-to-ts](https://github.com/ThomasAribart/json-schema-to-ts).
- [`@fastify/type-provider-typebox`](https://github.com/fastify/fastify-type-provider-typebox)
  Fastify
  [type provider](https://www.fastify.io/docs/latest/Reference/Type-Providers/)
  for [Typebox](https://github.com/sinclairzx81/typebox).
- [`@fastify/under-pressure`](https://github.com/fastify/under-pressure) Measure
  process load with automatic handling of _"Service Unavailable"_ plugin for
  Fastify.
- [`@fastify/url-data`](https://github.com/fastify/fastify-url-data) Decorate
  the `Request` object with a method to access raw URL components.
- [`@fastify/view`](https://github.com/fastify/point-of-view) Templates
  rendering (_ejs, pug, handlebars, marko_) plugin support for Fastify.
- [`@fastify/websocket`](https://github.com/fastify/fastify-websocket) WebSocket
  support for Fastify. Built upon [ws](https://github.com/websockets/ws).

#### [Community](#community)

- [`@applicazza/fastify-nextjs`](https://github.com/applicazza/fastify-nextjs)
  Alternate Fastify and Next.js integration.
- [`@coobaha/typed-fastify`](https://github.com/Coobaha/typed-fastify) Strongly
  typed routes with a runtime validation using JSON schema generated from types.
- [`@dnlup/fastify-doc`](https://github.com/dnlup/fastify-doc) A plugin for
  sampling process metrics.
- [`@dnlup/fastify-traps`](https://github.com/dnlup/fastify-traps) A plugin to
  close the server gracefully on `SIGINT` and `SIGTERM` signals.
- [`@eropple/fastify-openapi3`](https://github.com/eropple/fastify-openapi3) Provides
  easy, developer-friendly OpenAPI 3.1 specs + doc explorer based on your routes.
- [`@ethicdevs/fastify-custom-session`](https://github.com/EthicDevs/fastify-custom-session)
  A plugin that let you use session and decide only where to load/save from/to. Has
  great TypeScript support + built-in adapters for common ORMs/databases (Firebase,
  Prisma Client, Postgres (wip), InMemory) and you can easily make your own adapter!
- [`@ethicdevs/fastify-git-server`](https://github.com/EthicDevs/fastify-git-server)
  A plugin to easily create git server and make one/many Git repositories available
  for clone/fetch/push through the standard `git` (over http) commands.
- [`@fastify-userland/request-id`](https://github.com/fastify-userland/request-id)
  Fastify Request ID Plugin
- [`@fastify-userland/typeorm-query-runner`](https://github.com/fastify-userland/typeorm-query-runner)
  Fastify typeorm QueryRunner plugin
- [`@gquittet/graceful-server`](https://github.com/gquittet/graceful-server)
  Tiny (~5k), Fast, KISS, and dependency-free Node.JS library to make your
  Fastify API graceful.
- [`@h4ad/serverless-adapter`](https://github.com/H4ad/serverless-adapter)
  Run REST APIs and other web applications using your existing Node.js
  application framework (Express, Koa, Hapi and Fastify), on top of AWS Lambda,
  Huawei and many other clouds.
- [`@immobiliarelabs/fastify-metrics`](https://github.com/immobiliare/fastify-metrics)
  Minimalistic and opinionated plugin that collects usage/process metrics and
  dispatches to [statsd](https://github.com/statsd/statsd).
- [`@immobiliarelabs/fastify-sentry`](https://github.com/immobiliare/fastify-sentry)
  Sentry errors handler that just works! Install, add your DSN and you're good
  to go!
- [`@mateonunez/fastify-lyra`](https://github.com/mateonunez/fastify-lyra)
  A plugin to implement [Lyra](https://github.com/nearform/lyra) search engine
  on Fastify
- [`@mgcrea/fastify-graceful-exit`](https://github.com/mgcrea/fastify-graceful-exit)
  A plugin to close the server gracefully
- [`@mgcrea/fastify-request-logger`](https://github.com/mgcrea/fastify-request-logger)
  A plugin to enable compact request logging for Fastify
- [`@mgcrea/fastify-session`](https://github.com/mgcrea/fastify-session) Session
  plugin for Fastify that supports both stateless and stateful sessions
- [`@mgcrea/fastify-session-redis-store`](https://github.com/mgcrea/fastify-session-redis-store)
  Redis store for @mgcrea/fastify-session using ioredis
- [`@mgcrea/fastify-session-sodium-crypto`](https://github.com/mgcrea/fastify-session-sodium-crypto)
  Fast sodium-based crypto for @mgcrea/fastify-session
- [`@mgcrea/pino-pretty-compact`](https://github.com/mgcrea/pino-pretty-compact)
  A custom compact pino-base prettifier
- [`@trubavuong/fastify-seaweedfs`](https://github.com/trubavuong/fastify-seaweedfs)
  SeaweedFS for Fastify
- [`apollo-server-fastify`](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-fastify)
  Run an [Apollo Server](https://github.com/apollographql/apollo-server) to
  serve GraphQL with Fastify.
- [`arecibo`](https://github.com/nucleode/arecibo) Fastify ping responder for
  Kubernetes Liveness and Readiness Probes.
- [`cls-rtracer`](https://github.com/puzpuzpuz/cls-rtracer) Fastify middleware
  for CLS-based request ID generation. An out-of-the-box solution for adding
  request IDs into your logs.
- [`electron-server`](https://github.com/anonrig/electron-server) A plugin for
  using Fastify without the need of consuming a port on Electron apps.
- [`fast-water`](https://github.com/tswayne/fast-water) A Fastify plugin for
  waterline. Decorates Fastify with waterline models.
- [`fastify-405`](https://github.com/Eomm/fastify-405) Fastify plugin that adds
  405 HTTP status to your routes
- [`fastify-allow`](https://github.com/mattbishop/fastify-allow) Fastify plugin
  that automatically adds an Allow header to responses with routes. Also sends
  405 responses for routes that have a handler but not for the request's method.
- [`fastify-amqp`](https://github.com/RafaelGSS/fastify-amqp) Fastify AMQP
  connection plugin, to use with RabbitMQ or another connector. Just a wrapper
  to [`amqplib`](https://github.com/squaremo/amqp.node).
- [`fastify-amqp-async`](https://github.com/kffl/fastify-amqp-async) Fastify
  AMQP plugin with a Promise-based API provided by
  [`amqplib-as-promised`](https://github.com/twawszczak/amqplib-as-promised).
- [`fastify-angular-universal`](https://github.com/exequiel09/fastify-angular-universal)
  Angular server-side rendering support using
  [`@angular/platform-server`](https://github.com/angular/angular/tree/master/packages/platform-server)
  for Fastify
- [`fastify-api-key`](https://github.com/arkerone/fastify-api-key) Fastify
  plugin to authenticate HTTP requests based on api key and signature
- [`fastify-appwrite`](https://github.com/Dev-Manny/fastify-appwrite) Fastify
  Plugin for interacting with Appwrite server.
- [`fastify-at-mysql`](https://github.com/mateonunez/fastify-at-mysql) Fastify
  MySQL plugin with auto SQL injection attack prevention.
- [`fastify-at-postgres`](https://github.com/mateonunez/fastify-at-postgres) Fastify
  Postgres plugin with auto SQL injection attack prevention.
- [`fastify-auth0-verify`](https://github.com/nearform/fastify-auth0-verify):
  Auth0 verification plugin for Fastify, internally uses
  [fastify-jwt](https://npm.im/fastify-jwt) and
  [jsonwebtoken](https://npm.im/jsonwebtoken).
- [`fastify-autocrud`](https://github.com/paranoiasystem/fastify-autocrud)
  Plugin to auto-generate CRUD routes as fast as possible.
- [`fastify-autoroutes`](https://github.com/GiovanniCardamone/fastify-autoroutes)
  Plugin to scan and load routes based on filesystem path from a custom
  directory.
- [`fastify-aws-sns`](https://github.com/gzileni/fastify-aws-sns) Fastify plugin
  for AWS Simple Notification Service (AWS SNS) that coordinates and manages
  the delivery or sending of messages to subscribing endpoints or clients.
- [`fastify-aws-timestream`](https://github.com/gzileni/fastify-aws-timestream)
  Fastify plugin for managing databases, tables, and querying and creating
  scheduled queries with AWS Timestream.
- [`fastify-axios`](https://github.com/davidedantonio/fastify-axios) Plugin to
  send HTTP requests via [axios](https://github.com/axios/axios).
- [`fastify-babel`](https://github.com/cfware/fastify-babel) Fastify plugin for
  development servers that require Babel transformations of JavaScript sources.
- [`fastify-bcrypt`](https://github.com/beliven-it/fastify-bcrypt) A Bcrypt hash
  generator & checker.
- [`fastify-blipp`](https://github.com/PavelPolyakov/fastify-blipp) Prints your
  routes to the console, so you definitely know which endpoints are available.
- [`fastify-bookshelf`](https://github.com/butlerx/fastify-bookshelfjs) Fastify
  plugin to add [bookshelf.js](https://bookshelfjs.org/) ORM support.
- [`fastify-boom`](https://github.com/jeromemacias/fastify-boom) Fastify plugin
  to add [boom](https://github.com/hapijs/boom) support.
- [`fastify-bree`](https://github.com/climba03003/fastify-bree) Fastify plugin
  to add [bree](https://github.com/breejs/bree) support.
- [`fastify-bugsnag`](https://github.com/ZigaStrgar/fastify-bugsnag) Fastify plugin
  to add support for [Bugsnag](https://www.bugsnag.com/) error reporting.
- [`fastify-casbin`](https://github.com/nearform/fastify-casbin) Casbin support
  for Fastify.
- [`fastify-casbin-rest`](https://github.com/nearform/fastify-casbin-rest)
  Casbin support for Fastify based on a RESTful model.
- [`fastify-casl`](https://github.com/Inlecom/fastify-casl) Fastify
  [CASL](https://github.com/stalniy/casl) plugin that supports ACL-like
  protection of endpoints via either a preSerialization & preHandler hook,
  sanitizing the inputs and outputs of your application based on user rights.
- [`fastify-cloudevents`](https://github.com/smartiniOnGitHub/fastify-cloudevents)
  Fastify plugin to generate and forward Fastify events in the Cloudevents
  format.
- [`fastify-cockroachdb`](https://github.com/alex-ppg/fastify-cockroachdb)
  Fastify plugin to connect to a CockroachDB PostgreSQL instance via the
  Sequelize ORM.
- [`fastify-constraints`](https://github.com/nearform/fastify-constraints)
  Fastify plugin to add constraints to multiple routes
- [`fastify-couchdb`](https://github.com/nigelhanlon/fastify-couchdb) Fastify
  plugin to add CouchDB support via [nano](https://github.com/apache/nano).
- [`fastify-crud-generator`](https://github.com/beliven-it/fastify-crud-generator)
  A plugin to rapidly generate CRUD routes for any entity.
- [`fastify-custom-healthcheck`](https://github.com/gkampitakis/fastify-custom-healthcheck)
  Fastify plugin to add health route in your server that asserts custom
  functions.
- [`fastify-decorators`](https://github.com/L2jLiga/fastify-decorators) Fastify
  plugin that provides the set of TypeScript decorators.
- [`fastify-disablecache`](https://github.com/Fdawgs/fastify-disablecache)
  Fastify plugin to disable client-side caching, inspired by
  [nocache](https://github.com/helmetjs/nocache).
- [`fastify-dynamodb`](https://github.com/matrus2/fastify-dynamodb) AWS DynamoDB
  plugin for Fastify. It exposes
  [AWS.DynamoDB.DocumentClient()](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html)
  object.
- [`fastify-dynareg`](https://github.com/greguz/fastify-dynareg) Dynamic plugin
  register for Fastify.
- [`fastify-early-hints`](https://github.com/zekth/fastify-early-hints) Plugin
  to add HTTP 103 feature based on [RFC
  8297](https://httpwg.org/specs/rfc8297.html)
- [`fastify-envalid`](https://github.com/alemagio/fastify-envalid) Fastify
  plugin to integrate [envalid](https://github.com/af/envalid) in your Fastify
  project.
- [`fastify-error-page`](https://github.com/hemerajs/fastify-error-page) Fastify
  plugin to print errors in structured HTML to the browser.
- [`fastify-esso`](https://github.com/patrickpissurno/fastify-esso) The easiest
  authentication plugin for Fastify, with built-in support for Single sign-on
  (and great documentation).
- [`fastify-explorer`](https://github.com/Eomm/fastify-explorer) Get control of
  your decorators across all the encapsulated contexts.
- [`fastify-favicon`](https://github.com/smartiniOnGitHub/fastify-favicon)
  Fastify plugin to serve default favicon.
- [`fastify-feature-flags`](https://gitlab.com/m03geek/fastify-feature-flags)
  Fastify feature flags plugin with multiple providers support (e.g. env,
  [config](https://lorenwest.github.io/node-config/),
  [unleash](https://unleash.github.io/)).
- [`fastify-file-routes`](https://github.com/spa5k/fastify-file-routes) Get
  Next.js based file system routing into fastify.
- [`fastify-file-upload`](https://github.com/huangang/fastify-file-upload)
  Fastify plugin for uploading files.
- [`fastify-firebase`](https://github.com/now-ims/fastify-firebase) Fastify
  plugin for [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
  to Fastify so you can easily use Firebase Auth, Firestore, Cloud Storage,
  Cloud Messaging, and more.
- [`fastify-firebase-auth`](https://github.com/oxsav/fastify-firebase-auth)
  Firebase Authentication for Fastify supporting all of the methods relating to
  the authentication API.
- [`fastify-formidable`](https://github.com/climba03003/fastify-formidable)
  Handy plugin to provide multipart support and fastify-swagger integration.
- [`fastify-gcloud-trace`](https://github.com/mkinoshi/fastify-gcloud-trace)
  [Google Cloud Trace API](https://cloud.google.com/trace/docs/reference)
  Connector for Fastify.
- [`fastify-get-head`](https://github.com/MetCoder95/fastify-get-head) Small
  plugin to set a new HEAD route handler for each GET route previously
  registered in Fastify.
- [`fastify-get-only`](https://github.com/DanieleFedeli/fastify-get-only) Small
  plugin used to make fastify accept only GET requests
- [`fastify-good-sessions`](https://github.com/Phara0h/fastify-good-sessions) A
  good Fastify sessions plugin focused on speed.
- [`fastify-google-cloud-storage`](https://github.com/carlozamagni/fastify-google-cloud-storage)
  Fastify plugin that exposes a GCP Cloud Storage client instance.
- [`fastify-graceful-shutdown`](https://github.com/hemerajs/fastify-graceful-shutdown)
  Shutdown Fastify gracefully and asynchronously.
- [`fastify-grant`](https://github.com/simov/fastify-grant)
  Authentication/Authorization plugin for Fastify that supports 200+ OAuth
  Providers.
- [`fastify-guard`](https://github.com/hsynlms/fastify-guard) A Fastify plugin
  that protects endpoints by checking authenticated user roles and/or scopes.
- [`fastify-hasura`](https://github.com/ManUtopiK/fastify-hasura) A Fastify
  plugin to have fun with [Hasura](https://github.com/hasura/graphql-engine).
- [`fastify-healthcheck`](https://github.com/smartiniOnGitHub/fastify-healthcheck)
  Fastify plugin to serve a health check route and a probe script.
- [`fastify-hemera`](https://github.com/hemerajs/fastify-hemera) Fastify Hemera
  plugin, for writing reliable & fault-tolerant microservices with
  [nats.io](https://nats.io/).
- [`fastify-http-client`](https://github.com/kenuyx/fastify-http-client) Plugin
  to send HTTP(s) requests. Built upon [urllib](https://github.com/node-modules/urllib).
- [`fastify-http-context`](https://github.com/thorough-developer/fastify-http-context)
  Fastify plugin for "simulating" a thread of execution to allow for true HTTP
  context to take place per API call within the Fastify lifecycle of calls.
- [`fastify-http-errors-enhanced`](https://github.com/ShogunPanda/fastify-http-errors-enhanced)
  An error handling plugin for Fastify that uses enhanced HTTP errors.
- [`fastify-http2https`](https://github.com/lolo32/fastify-http2https) Redirect
  HTTP requests to HTTPS, both using the same port number, or different response
  on HTTP and HTTPS.
- [`fastify-https-always`](https://github.com/mattbishop/fastify-https-always)
  Lightweight, proxy-aware redirect plugin from HTTP to HTTPS.
- [`fastify-https-redirect`](https://github.com/tomsvogel/fastify-https-redirect)
  Fastify plugin for auto-redirect from HTTP to HTTPS.
- [`fastify-impressions`](https://github.com/manju4ever/fastify-impressions)
  Fastify plugin to track impressions of all the routes.
- [`fastify-influxdb`](https://github.com/alex-ppg/fastify-influxdb) Fastify
  InfluxDB plugin connecting to an InfluxDB instance via the Influx default
  package.
- [`fastify-jwt-authz`](https://github.com/Ethan-Arrowood/fastify-jwt-authz) JWT
  user scope verifier.
- [`fastify-jwt-webapp`](https://github.com/charlesread/fastify-jwt-webapp) JWT
  authentication for Fastify-based web apps.
- [`fastify-kafkajs`](https://github.com/kffl/fastify-kafkajs) Fastify plugin
  that adds support for KafkaJS - a modern Apache Kafka client library.
- [`fastify-keycloak-adapter`](https://github.com/yubinTW/fastify-keycloak-adapter)
  A keycloak adapter for a Fastify app.
- [`fastify-knexjs`](https://github.com/chapuletta/fastify-knexjs) Fastify
  plugin for support KnexJS Query Builder.
- [`fastify-knexjs-mock`](https://github.com/chapuletta/fastify-knexjs-mock)
  Fastify Mock KnexJS for testing support.
- [`fastify-kubernetes`](https://github.com/greguz/fastify-kubernetes) Fastify
  Kubernetes client plugin.
- [`fastify-language-parser`](https://github.com/lependu/fastify-language-parser)
  Fastify plugin to parse request language.
- [`fastify-lcache`](https://github.com/denbon05/fastify-lcache)
  Lightweight cache plugin
- [`fastify-list-routes`](https://github.com/chuongtrh/fastify-list-routes) 
  A simple plugin for Fastify list all available routes.
- [`fastify-loader`](https://github.com/TheNoim/fastify-loader) Load routes from
  a directory and inject the Fastify instance in each file.
- [`fastify-lured`](https://github.com/lependu/fastify-lured) Plugin to load lua
  scripts with [fastify-redis](https://github.com/fastify/fastify-redis) and
  [lured](https://github.com/enobufs/lured).
- [`fastify-lyra`](https://github.com/mateonunez/fastify-lyra)
  A plugin to implement [Lyra](https://github.com/LyraSearch/lyra) search engine
  on Fastify.
- [`fastify-mailer`](https://github.com/coopflow/fastify-mailer) Plugin to
  initialize and encapsulate [Nodemailer](https://nodemailer.com)'s transporters
  instances in Fastify.
- [`fastify-markdown`](https://github.com/freezestudio/fastify-markdown) Plugin
  to markdown support.
- [`fastify-method-override`](https://github.com/corsicanec82/fastify-method-override)
  Plugin for Fastify, which allows the use of HTTP verbs, such as DELETE, PATCH,
  HEAD, PUT, OPTIONS in case the client doesn't support them.
- [`fastify-metrics`](https://gitlab.com/m03geek/fastify-metrics) Plugin for
  exporting [Prometheus](https://prometheus.io) metrics.
- [`fastify-minify`](https://github.com/Jelenkee/fastify-minify) Plugin for
  minification and transformation of responses.
- [`fastify-mongo-memory`](https://github.com/chapuletta/fastify-mongo-memory)
  Fastify MongoDB in Memory Plugin for testing support.
- [`fastify-mongodb-sanitizer`](https://github.com/KlemenKozelj/fastify-mongodb-sanitizer)
  Fastify plugin that sanitizes client input to prevent
  potential MongoDB query injection attacks.
- [`fastify-mongoose-api`](https://github.com/jeka-kiselyov/fastify-mongoose-api)
  Fastify plugin to create REST API methods based on Mongoose MongoDB models.
- [`fastify-mongoose-driver`](https://github.com/alex-ppg/fastify-mongoose)
  Fastify Mongoose plugin that connects to a MongoDB via the Mongoose plugin
  with support for Models.
- [`fastify-mqtt`](https://github.com/love-lena/fastify-mqtt) Plugin to share
  [mqtt](https://www.npmjs.com/package/mqtt) client across Fastify.
- [`fastify-msgpack`](https://github.com/kenriortega/fastify-msgpack) Fastify
  and MessagePack, together at last. Uses @msgpack/msgpack by default.
- [`fastify-multer`](https://github.com/fox1t/fastify-multer) Multer is a plugin
  for handling multipart/form-data, which is primarily used for uploading files.
- [`fastify-nats`](https://github.com/mahmed8003/fastify-nats) Plugin to share
  [NATS](https://nats.io) client across Fastify.
- [`fastify-next-auth`](https://github.com/wobsoriano/fastify-next-auth)
  NextAuth.js plugin for Fastify.
- [`fastify-no-additional-properties`](https://github.com/greguz/fastify-no-additional-properties)
  Add `additionalProperties: false` by default to your JSON Schemas.
- [`fastify-no-icon`](https://github.com/jsumners/fastify-no-icon) Plugin to
  eliminate thrown errors for `/favicon.ico` requests.
- [`fastify-nodemailer`](https://github.com/lependu/fastify-nodemailer) Plugin
  to share [nodemailer](https://nodemailer.com) transporter across Fastify.
- [`fastify-normalize-request-reply`](https://github.com/ericrglass/fastify-normalize-request-reply)
  Plugin to normalize the request and reply to the Express version 4.x request
  and response, which allows use of middleware, like swagger-stats, that was
  originally written for Express.
- [`fastify-now`](https://github.com/yonathan06/fastify-now) Structure your
  endpoints in a folder and load them dynamically with Fastify.
- [`fastify-nuxtjs`](https://github.com/gomah/fastify-nuxtjs) Vue server-side
  rendering support for Fastify with Nuxt.js Framework.
- [`fastify-oas`](https://gitlab.com/m03geek/fastify-oas) Generates OpenAPI 3.0+
  documentation from routes schemas for Fastify.
- [`fastify-objectionjs`](https://github.com/jarcodallo/fastify-objectionjs)
  Plugin for the Fastify framework that provides integration with objectionjs
  ORM.
- [`fastify-objectionjs-classes`](https://github.com/kamikazechaser/fastify-objectionjs-classes)
  Plugin to cherry-pick classes from objectionjs ORM.
- [`fastify-openapi-docs`](https://github.com/ShogunPanda/fastify-openapi-docs)
  A Fastify plugin that generates OpenAPI spec automatically.
- [`fastify-openapi-glue`](https://github.com/seriousme/fastify-openapi-glue)
  Glue for OpenAPI specifications in Fastify, autogenerates routes based on an
  OpenAPI Specification.
- [`fastify-opentelemetry`](https://github.com/autotelic/fastify-opentelemetry)
  A Fastify plugin that uses the [OpenTelemetry
  API](https://github.com/open-telemetry/opentelemetry-js-api) to provide
  request tracing.
- [`fastify-oracle`](https://github.com/cemremengu/fastify-oracle) Attaches an
  [`oracledb`](https://github.com/oracle/node-oracledb) connection pool to a
  Fastify server instance.
- [`fastify-orientdb`](https://github.com/mahmed8003/fastify-orientdb) Fastify
  OrientDB connection plugin, with which you can share the OrientDB connection
  across every part of your server.
- [`fastify-osm`](https://github.com/gzileni/fastify-osm) Fastify
  OSM plugin to run overpass queries by OpenStreetMap.
- [`fastify-peekaboo`](https://github.com/simone-sanfratello/fastify-peekaboo)
  Fastify plugin for memoize responses by expressive settings.
- [`fastify-piscina`](https://github.com/piscinajs/fastify-piscina) A worker
  thread pool plugin using [Piscina](https://github.com/piscinajs/piscina).
- [`fastify-polyglot`](https://github.com/beliven-it/fastify-polyglot) A plugin to
  handle i18n using
  [node-polyglot](https://www.npmjs.com/package/node-polyglot).
- [`fastify-postgraphile`](https://github.com/alemagio/fastify-postgraphile)
  Plugin to integrate [PostGraphile](https://www.graphile.org/postgraphile/) in
  a Fastify project.
- [`fastify-prettier`](https://github.com/hsynlms/fastify-prettier) A Fastify
  plugin that uses [prettier](https://github.com/prettier/prettier) under the
  hood to beautify outgoing responses and/or other things in the Fastify server.
- [`fastify-print-routes`](https://github.com/ShogunPanda/fastify-print-routes)
  A Fastify plugin that prints all available routes.
- [`fastify-protobufjs`](https://github.com/kenriortega/fastify-protobufjs)
  Fastify and protobufjs, together at last. Uses protobufjs by default.
- [`fastify-qrcode`](https://github.com/chonla/fastify-qrcode) This plugin
  utilizes [qrcode](https://github.com/soldair/node-qrcode) to generate QR Code.
- [`fastify-qs`](https://github.com/vanodevium/fastify-qs) A plugin for Fastify
  that adds support for parsing URL query parameters with
  [qs](https://github.com/ljharb/qs).
- [`fastify-racing`](https://github.com/metcoder95/fastify-racing) Fastify's
  plugin that adds support to handle an aborted request asynchronous.
- [`fastify-ravendb`](https://github.com/nearform/fastify-ravendb) RavenDB
  connection plugin. It exposes the same `DocumentStore` (or multiple ones)
  across the whole Fastify application.
- [`fastify-raw-body`](https://github.com/Eomm/fastify-raw-body) Add the
  `request.rawBody` field.
- [`fastify-rbac`](https://gitlab.com/m03geek/fastify-rbac) Fastify role-based
  access control plugin.
- [`fastify-recaptcha`](https://github.com/qwertyforce/fastify-recaptcha)
  Fastify plugin for recaptcha verification.
- [`fastify-redis-channels`](https://github.com/hearit-io/fastify-redis-channels)
  A plugin for fast, reliable, and scalable channels implementation based on
  Redis streams.
- [`fastify-register-routes`](https://github.com/israeleriston/fastify-register-routes)
  Plugin to automatically load routes from a specified path and optionally limit
  loaded file names by a regular expression.
- [`fastify-response-caching`](https://github.com/codeaholicguy/fastify-response-caching)
  A Fastify plugin for caching the response.
- [`fastify-response-time`](https://github.com/lolo32/fastify-response-time) Add
  `X-Response-Time` header at each request for Fastify, in milliseconds.
- [`fastify-resty`](https://github.com/FastifyResty/fastify-resty) Fastify-based
  web framework with REST API routes auto-generation for TypeORM entities using
  DI and decorators.
- [`fastify-reverse-routes`](https://github.com/dimonnwc3/fastify-reverse-routes)
  Fastify reverse routes plugin, allows to defined named routes and build path
  using name and parameters.
- [`fastify-rob-config`](https://github.com/jeromemacias/fastify-rob-config)
  Fastify Rob-Config integration.
- [`fastify-route-group`](https://github.com/TakNePoidet/fastify-route-group)
  Convenient grouping and inheritance of routes.
- [`fastify-s3-buckets`](https://github.com/kibertoad/fastify-s3-buckets)
  Ensure the existence of defined S3 buckets on the application startup.
- [`fastify-schema-constraint`](https://github.com/Eomm/fastify-schema-constraint)
  Choose the JSON schema to use based on request parameters.
- [`fastify-schema-to-typescript`](https://github.com/thomasthiebaud/fastify-schema-to-typescript)
  Generate typescript types based on your JSON/YAML validation schemas so they
  are always in sync.
- [`fastify-sentry`](https://github.com/alex-ppg/fastify-sentry) Fastify plugin
  to add the Sentry SDK error handler to requests.
- [`fastify-sequelize`](https://github.com/lyquocnam/fastify-sequelize) Fastify
  plugin work with Sequelize (adapter for NodeJS -> Sqlite, Mysql, Mssql,
  Postgres).
- [`fastify-server-session`](https://github.com/jsumners/fastify-server-session)
  A session plugin with support for arbitrary backing caches via
  `fastify-caching`.
- [`fastify-slonik`](https://github.com/Unbuttun/fastify-slonik) Fastify Slonik
  plugin, with this you can use slonik in every part of your server.
- [`fastify-slow-down`](https://github.com/nearform/fastify-slow-down) A plugin 
  to delay the response from the server.
- [`fastify-socket.io`](https://github.com/alemagio/fastify-socket.io) a
  Socket.io plugin for Fastify.
- [`fastify-split-validator`](https://github.com/MetCoder95/fastify-split-validator)
  Small plugin to allow you use multiple validators in one route based on each
  HTTP part of the request.
- [`fastify-sqlite`](https://github.com/Eomm/fastify-sqlite) connects your
  application to a sqlite3 database.
- [`fastify-sse`](https://github.com/lolo32/fastify-sse) to provide Server-Sent
  Events with `reply.sse( … )` to Fastify.
- [`fastify-sse-v2`](https://github.com/nodefactoryio/fastify-sse-v2) to provide
  Server-Sent Events using Async Iterators (supports newer versions of Fastify).
- [`fastify-ssr-vite`](https://github.com/nineohnine/fastify-ssr-vite) A simple
  plugin for setting up server side rendering with vite.
- [`fastify-stripe`](https://github.com/coopflow/fastify-stripe) Plugin to
  initialize and encapsulate [Stripe
  Node.js](https://github.com/stripe/stripe-node) instances in Fastify.
- [`fastify-supabase`](https://github.com/coopflow/fastify-supabase) Plugin to
  initialize and encapsulate [Supabase](https://github.com/supabase/supabase-js)
  instances in Fastify.
- [`fastify-tls-keygen`](https://gitlab.com/sebdeckers/fastify-tls-keygen)
  Automatically generate a browser-compatible, trusted, self-signed,
  localhost-only, TLS certificate.
- [`fastify-tokenize`](https://github.com/Bowser65/fastify-tokenize)
  [Tokenize](https://github.com/Bowser65/Tokenize) plugin for Fastify that
  removes the pain of managing authentication tokens, with built-in integration
  for `fastify-auth`.
- [`fastify-totp`](https://github.com/beliven-it/fastify-totp) A plugin to handle
  TOTP (e.g. for 2FA).
- [`fastify-twitch-ebs-tools`](https://github.com/lukemnet/fastify-twitch-ebs-tools)
  Useful functions for Twitch Extension Backend Services (EBS).
- [`fastify-type-provider-zod`](https://github.com/turkerdev/fastify-type-provider-zod)
  Fastify
  [type provider](https://www.fastify.io/docs/latest/Reference/Type-Providers/)
  for [zod](https://github.com/colinhacks/zod).
- [`fastify-typeorm-plugin`](https://github.com/inthepocket/fastify-typeorm-plugin)
  Fastify plugin to work with TypeORM.
- [`fastify-user-agent`](https://github.com/Eomm/fastify-user-agent) parses your
  request's `user-agent` header.
- [`fastify-vhost`](https://github.com/patrickpissurno/fastify-vhost) Proxy
  subdomain HTTP requests to another server (useful if you want to point
  multiple subdomains to the same IP address, while running different servers on
  the same machine).
- [`fastify-vite`](https://github.com/galvez/fastify-vite)
  [Vite](https://vitejs.dev/) plugin for Fastify with SSR data support.
- [`fastify-vue-plugin`](https://github.com/TheNoim/fastify-vue)
  [Nuxt.js](https://nuxtjs.org) plugin for Fastify. Control the routes nuxt
  should use.
- [`fastify-wamp-router`](https://github.com/lependu/fastify-wamp-router) Web
  Application Messaging Protocol router for Fastify.
- [`fastify-webpack-hmr`](https://github.com/lependu/fastify-webpack-hmr)
  Webpack hot module reloading plugin for Fastify.
- [`fastify-webpack-hot`](https://github.com/gajus/fastify-webpack-hot) Webpack
  Hot Module Replacement for Fastify.
- [`fastify-ws`](https://github.com/gj/fastify-ws) WebSocket integration for
  Fastify — with support for WebSocket lifecycle hooks instead of a single
  handler function. Built upon [ws](https://github.com/websockets/ws) and
  [uws](https://github.com/uNetworking/uWebSockets).
- [`fastify-xml-body-parser`](https://github.com/NaturalIntelligence/fastify-xml-body-parser)
  Parse XML payload / request body into JS / JSON object.
- [`fastify-xray`](https://github.com/jeromemacias/fastify-xray) Fastify plugin
  for AWS XRay recording.
- [`i18next-http-middleware`](https://github.com/i18next/i18next-http-middleware#fastify-usage)
  An [i18next](https://www.i18next.com) based i18n (internationalization)
  middleware to be used with Node.js web frameworks like Express or Fastify and
  also for Deno.
- [`k-fastify-gateway`](https://github.com/jkyberneees/fastify-gateway) API
  Gateway plugin for Fastify, a low footprint implementation that uses the
  `fastify-reply-from` HTTP proxy library.
- [`mercurius`](https://mercurius.dev/) A fully-featured and performant GraphQL
  server implementation for Fastify.
- [`nstats`](https://github.com/Phara0h/nstats) A fast and compact way to get
  all your network and process stats for your node application. Websocket,
  HTTP/S, and prometheus compatible!
- [`oas-fastify`](https://github.com/ahmadnassri/node-oas-fastify) OAS 3.x to
  Fastify routes automation. Automatically generates route handlers with fastify
  configuration and validation.
- [`openapi-validator-middleware`](https://github.com/PayU/openapi-validator-middleware#fastify)
  Swagger and OpenAPI 3.0 spec-based request validation middleware that supports
  Fastify.
- [`pubsub-http-handler`](https://github.com/cobraz/pubsub-http-handler) A Fastify
  plugin to easily create Google Cloud PubSub endpoints.
- [`sequelize-fastify`](https://github.com/hsynlms/sequelize-fastify) A simple
  and lightweight Sequelize plugin for Fastify.
- [`typeorm-fastify-plugin`](https://github.com/jclemens24/fastify-typeorm) A simple
  and updated Typeorm plugin for use with Fastify.

#### [Community Tools](#community-tools)
- [`@fastify-userland/workflows`](https://github.com/fastify-userland/workflows)
  Reusable workflows for use in the Fastify plugin
- [`fast-maker`](https://github.com/imjuni/fast-maker) route configuration
  generator by directory structure.
- [`simple-tjscli`](https://github.com/imjuni/simple-tjscli) CLI tool to
  generate JSON Schema from TypeScript interfaces.
