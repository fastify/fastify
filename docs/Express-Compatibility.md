<h1 align="center">Fastify</h1>

## Middleware Compatibility

Fastify provides Express middleware compatibility similar to [connect](https://github.com/senchalabs/connect). Since Express modifies the prototype of the node core Request and Response objects heavily, Fastify cannot guarantee full middleware compatibility.
