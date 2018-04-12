<h1 align="center">Fastify</h1>

## Ecosystem
Plugins maintained by the fastify team are listed under [Core](#core) while plugins maintained by the community are listed in the [Community](#community) section.

#### [Core](#core)
- [`fastify-accepts`](https://github.com/fastify/fastify-accepts) to have [accepts](https://www.npmjs.com/package/accepts) in your request object.
- [`fastify-accepts-serializer`](https://github.com/fastify/fastify-accepts-serializer) to serialize to output according to `Accept` header.
- [`fastify-auth`](https://github.com/fastify/fastify-auth) Run multiple auth functions in Fastify.
- [`fastify-bankai`](https://github.com/fastify/fastify-bankai) [Bankai](https://github.com/yoshuawuyts/bankai) assets compiler for Fastify.
- [`fastify-bearer-auth`](https://github.com/fastify/fastify-bearer-auth) Bearer auth plugin for Fastify.
- [`fastify-caching`](https://github.com/fastify/fastify-caching) General server-side cache and etag support.
- [`fastify-circuit-breaker`](https://github.com/fastify/fastify-circuit-breaker) A low overhead circuit breaker for your routes.
- [`fastify-compress`](https://github.com/fastify/fastify-compress) Fastify compression utils.
- [`fastify-cookie`](https://github.com/fastify/fastify-cookie) Parse and set cookie headers.
- [`fastify-env`](https://github.com/fastify/fastify-env) Load and check configuration.
- [`fastify-elasticsearch`](https://github.com/fastify/fastify-elasticsearch) Plugin to share the same ES client.
- [`fastify-formbody`](https://github.com/fastify/fastify-formbody) Plugin to parse x-www-form-urlencoded bodies.
- [`fastify-helmet`](https://github.com/fastify/fastify-helmet) Important security headers for Fastify.
- [`fastify-http-proxy`](https://github.com/fastify/fastify-http-proxy)Proxy your http requests to another server, with hooks.
- [`fastify-jwt`](https://github.com/fastify/fastify-jwt) JWT utils for Fastify, internally uses [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken).
- [`fastify-leveldb`](https://github.com/fastify/fastify-leveldb) Plugin to share a common LevelDB connection across Fastify.
- [`fastify-mongodb`](https://github.com/fastify/fastify-mongodb) Fastify MongoDB connection plugin, with which you can share the same MongoDB connection pool across every part of your server.
- [`fastify-multipart`](https://github.com/fastify/fastify-multipart) Multipart support for Fastify.
- [`fastify-postgres`](https://github.com/fastify/fastify-postgres) Fastify PostgreSQL connection plugin, with this you can share the same PostgreSQL connection pool in every part of your server.
- [`fastify-rate-limit`](https://github.com/fastify/fastify-rate-limit) A low overhead rate limiter for your routes.
- [`fastify-react`](https://github.com/fastify/fastify-react) React server side rendering support for Fastify with [Next](https://github.com/zeit/next.js/).
- [`fastify-redis`](https://github.com/fastify/fastify-redis) Fastify Redis connection plugin, with which you can share the same Redis connection across every part of your server.
- [`fastify-reply-from`](https://github.com/fastify/fastify-reply-from) Plugin to forward the current http request to another server.
- [`fastify-sensible`](https://github.com/fastify/fastify-sensible) Defaults for Fastify that everyone can agree on. It adds some useful decorators such as http errors and assertions, but also more request and reply methods.
- [`fastify-static`](https://github.com/fastify/fastify-static) Plugin for serving static files as fast as possible.
- [`fastify-swagger`](https://github.com/fastify/fastify-swagger) Swagger documentation generator for Fastify.
- [`fastify-websocket`](https://github.com/fastify/fastify-websocket) WebSocket support for Fastify. Built upon [websocket-stream](https://github.com/maxogden/websocket-stream).
- [`fastify-url-data`](https://github.com/fastify/fastify-url-data) Decorate the `Request` object with a method to access raw URL components.
- [`point-of-view`](https://github.com/fastify/point-of-view) Templates rendering (*ejs, pug, handlebars, marko*) plugin support for Fastify.
- [`under-pressure`](https://github.com/fastify/under-pressure) Measure process load with automatic handling of *"Service Unavailable"* plugin for Fastify.

#### [Community](#community)
- [`fastify-angular-universal`](https://github.com/exequiel09/fastify-angular-universal) Angular server-side rendering support using [`@angular/platform-server`](https://github.com/angular/angular/tree/master/packages/platform-server) for Fastify
- [`fastify-apollo`](https://github.com/coopnd/fastify-apollo) Run an [Apollo Server](https://github.com/apollographql/apollo-server) to serve GraphQL with Fastify.
- [`fastify-blipp`](https://github.com/PavelPolyakov/fastify-blipp) Prints your routes to the console, so you definitely know which endpoints are available.
- [`fastify-bookshelf`](https://github.com/butlerx/fastify-bookshelfjs) Fastify plugin to add [bookshelf.js](http://bookshelfjs.org/) orm support.
- [`fastify-boom`](https://github.com/jeromemacias/fastify-boom) Fastify plugin to add [boom](https://github.com/hapijs/boom) support.
- [`fastify-datastore`](https://github.com/now-ims/now-fastify-datastore) Fastify plugin for [Google Cloud Datastore](https://cloud.google.com/nodejs/docs/reference/datastore/1.4.x/). 
- [`fastify-dynamodb`](https://github.com/matrus2/fastify-dynamodb) AWS DynamoDB plugin for Fastify. It exposes [AWS.DynamoDB.DocumentClient()](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html) object.
- [`fastify-error-page`](https://github.com/hemerajs/fastify-error-page) Fastify plugin to print errors in structured HTML to the browser.
- [`fastify-favicon`](https://github.com/smartiniOnGitHub/fastify-favicon) Fastify plugin to serve default favicon.
- [`fastify-firebase-auth`](https://github.com/oxsav/fastify-firebase-auth) Firebase Authentication for Fastify supporting all of the methods relating to the authentication API.
- [`fastify-firestore`](https://github.com/now-ims/fastify-firestore) Fastify plugin for [Google Cloud Firestore](https://cloud.google.com/nodejs/docs/reference/firestore/0.13.x/).
- [`fastify-graceful-shutdown`](https://github.com/hemerajs/fastify-graceful-shutdown) Shutdown Fastify gracefully and asynchronously.
- [`fastify-hemera`](https://github.com/hemerajs/fastify-hemera) Fastify Hemera plugin, for writing reliable & fault-tolerant microservices with [nats.io](https://nats.io/).
- [`fastify-jwt-authz`](https://github.com/Ethan-Arrowood/fastify-jwt-authz) JWT user scope verifier.
- [`fastify-knexjs`](https://github.com/chapuletta/fastify-knexjs) Fastify plugin for support KnexJS Query Builder.
- [`fastify-knexjs-mock`](https://github.com/chapuletta/fastify-knexjs-mock) Fastify Mock KnexJS for testing support.
- [`fastify-lured`](https://github.com/lependu/fastify-lured) Plugin to load lua scripts with [fastify-redis](https://github.com/fastify/fastify-redis) and [lured](https://github.com/enobufs/lured).
- [`fastify-mongo-memory`](https://github.com/chapuletta/fastify-mongo-memory) Fastify MongoDB in Memory Plugin for testing support.
- [`fastify-nats`](https://github.com/mahmed8003/fastify-nats) Plugin to share [NATS](http://nats.io) client across Fastify.
- [`fastify-no-icon`](https://github.com/jsumners/fastify-no-icon) Plugin to eliminate thrown errors for `/favicon.ico` requests.
- [`fastify-nodemailer`](https://github.com/lependu/fastify-nodemailer) Plugin to share [nodemailer](http://nodemailer.com) transporter across Fastify.
- [`fastify-nuxt`](https://github.com/lyquocnam/fastify-nuxt) VueJS server side rendering support for Fastify with [`NuxtJS`](https://nuxtjs.org/)
- [`fastify-oracle`](https://github.com/jsumners/fastify-oracle) Attaches an [`oracledb`](https://github.com/oracle/node-oracledb) connection pool to a Fastify server instance.
- [`fastify-orientdb`](https://github.com/mahmed8003/fastify-orientdb) Fastify OrientDB connection plugin, with which you can share the OrientDB connection across every part of your server.
- [`fastify-response-time`](https://github.com/lolo32/fastify-response-time) Add `X-Response-Time` header at each request for Fastify, in milliseconds.
- [`fastify-rob-config`](https://github.com/jeromemacias/fastify-rob-config) Fastify Rob-Config integration.
- [`fastify-sequelize`](https://github.com/lyquocnam/fastify-sequelize) Fastify plugin work with Sequelize (adapter for NodeJS -> Sqlite, Mysql, Mssql, Postgres).
- [`fastify-server-session`](https://github.com/jsumners/fastify-server-session) A session plugin with support for arbitrary backing caches via `fastify-caching`.
- [`fastify-session`](https://github.com/SerayaEryn/fastify-session) a session plugin for Fastify.
- [`fastify-sse`](https://github.com/lolo32/fastify-sse) to provide Server-Sent Events with `reply.sse( … )` to Fastify.
- [`fastify-tls-keygen`](https://gitlab.com/sebdeckers/fastify-tls-keygen) Automatically generate a browser-compatible, trusted, self-signed, localhost-only, TLS certificate.
- [`fastify-ws`](https://github.com/gj/fastify-ws) WebSocket integration for Fastify — with support for WebSocket lifecycle hooks instead of a single handler function. Built upon [ws](https://github.com/websockets/ws) and [uws](https://github.com/uNetworking/bindings/tree/master/nodejs).
