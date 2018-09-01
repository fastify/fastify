<h1 align="center">Fastify</h1>

## Error Handling

Due to [legacy domain limitations](https://nodejs.org/en/docs/guides/domain-postmortem/) in node, it is not possible to process all uncaught errors in a sensible way. Fastify follows an all-or-nothing approach and aims to be lean and optimal as much as possible. Thus, the developer is responsible for making sure that the errors are handled properly. Most of the errors are usually a result of unexpected input data, so we recommend specifying a [JSON.schema validation](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md) for your input data.

Note that, while Fastify doesn't catch uncaught error for you, if your route is declared as async, the error will be caught by the promise and handled by Fastify as a generic `Internal Server Error`. For customizing the behaviour, you should wrap your route logic in a `try/catch` statement.