<h1 align="center">Fastify</h1>

## Ecosystem
Plugins maintainted by the fastify team are listed under [Core](#core) while plugins maintained by the community are listed in the [Community](#community) section.

#### [Core](#core)
- [`fastify-accepts`](https://github.com/fastify/fastify-accepts) to have [accepts](https://www.npmjs.com/package/accepts) in your request object.
- [`fastify-accepts-serializer`](https://github.com/fastify/fastify-accepts-serializer) to serialize to output according to `Accept` header
- [`fastify-auth`](https://github.com/fastify/fastify-auth) Run multiple auth functions in Fastify
- [`fastify-bankai`](https://github.com/fastify/fastify-bankai) [Bankai](https://github.com/yoshuawuyts/bankai) assets compiler for Fastify
- [`fastify-bearer-auth`](https://github.com/fastify/fastify-bearer-auth) Bearer auth plugin for Fastify
- [`fastify-cookie`](https://github.com/fastify/fastify-cookie) Parse and set cookie headers
- [`fastify-env`](https://github.com/fastify/fastify-env) Load and check configuration
- [`fastify-formbody`](https://github.com/fastify/fastify-formbody) Plugin to parse x-www-form-urlencoded bodies
- [`fastify-helmet`](https://github.com/fastify/fastify-helmet) Important security headers for Fastify
- [`fastify-jwt`](https://github.com/fastify/fastify-jwt) JWT utils for Fastify, internally uses [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [`fastify-leveldb`](https://github.com/fastify/fastify-leveldb) Plugin to share a common LevelDB connection across Fastify.
- [`fastify-mongodb`](https://github.com/fastify/fastify-mongodb)
Fastify MongoDB connection plugin, with this you can share the same MongoDb connection pool in every part of your server.
- [`fastify-multipart`](https://github.com/fastify/fastify-multipart)
Multipart support for Fastify
- [`fastify-postgres`](https://github.com/fastify/fastify-postgres) Fastify PostgreSQL connection plugin, with this you can share the same PostgreSQL connection pool in every part of your server.
- [`fastify-react`](https://github.com/fastify/fastify-react) React server side rendering support for Fastify with [Next](https://github.com/zeit/next.js/)
- [`fastify-redis`](https://github.com/fastify/fastify-redis)
Fastify Redis connection plugin, with this you can share the same Redis connection in every part of your server.
- [`fastify-register-timeout`](https://github.com/fastify/fastify-register-timeout) Register plugin with a timeout
- [`fastify-swagger`](https://github.com/fastify/fastify-swagger)
Swagger documentation generator for Fastify
- [`fastify-websocket`](https://github.com/fastify/fastify-websocket) WebSocket support for Fastify. Built upon [websocket-stream](https://github.com/maxogden/websocket-stream)
- [`point-of-view`](https://github.com/fastify/point-of-view)
Templates rendering (*ejs, pug, handlebars, marko*) plugin support for Fastify.

#### [Community](#community)
- [`fastify-apollo`](https://github.com/coopnd/fastify-apollo) Run an [Apollo Server](https://github.com/apollographql/apollo-server) with Fastify. (GraphQL)
- [`fastify-graceful-shutdown`](https://github.com/hemerajs/fastify-graceful-shutdown) Shutdown Fastify graceful asynchronously
- [`fastify-hemera`](https://github.com/hemerajs/fastify-hemera) Fastify Hemera plugin, for writing reliable & fault-tolerant microservices with [nats.io](https://nats.io/)
- [`fastify-nats`](https://github.com/mahmed8003/fastify-nats)
Plugin to share [NATS](http://nats.io) client across Fastify.
- [`fastify-orientdb`](https://github.com/mahmed8003/fastify-orientdb)
Fastify OrientDB connection plugin, with this you can share the orientdb connection in every part of your server.
- [`fastify-sse`](https://github.com/lolo32/fastify-sse) to provide Server-Sent Events with `reply.sse( … )` to Fastify
