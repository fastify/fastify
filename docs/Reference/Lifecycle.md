<h1 align="center">Fastify</h1>

## Lifecycle
<a id="lifecycle"></a>

This schema shows the internal lifecycle of Fastify.

The right branch of each section shows the next phase of the lifecycle. The left
branch shows the corresponding error code generated if the parent throws an
error. All errors are automatically handled by Fastify.

```
Incoming Request
  │
  └─▶ Routing
        │
        └─▶ Instance Logger
             │
   4**/5** ◀─┴─▶ onRequest Hook
                  │
        4**/5** ◀─┴─▶ preParsing Hook
                        │
              4**/5** ◀─┴─▶ Parsing
                             │
                   4**/5** ◀─┴─▶ preValidation Hook
                                  │
                            400 ◀─┴─▶ Validation
                                        │
                              4**/5** ◀─┴─▶ preHandler Hook
                                              │
                                    4**/5** ◀─┴─▶ User Handler
                                                    │
                                                    └─▶ Reply
                                                          │
                                                4**/5** ◀─┴─▶ preSerialization Hook
                                                                │
                                                                └─▶ onSend Hook
                                                                      │
                                                            4**/5** ◀─┴─▶ Outgoing Response
                                                                            │
                                                                            └─▶ onResponse Hook
```

Before or during the `User Handler`, `reply.hijack()` can be called to:
- Prevent Fastify from running subsequent hooks and the user handler
- Prevent Fastify from sending the response automatically

If `reply.raw` is used to send a response, `onResponse` hooks will still
be executed.

## Reply Lifecycle
<a id="reply-lifecycle"></a>

When the user handles the request, the result may be:

- In an async handler: it returns a payload or throws an `Error`
- In a sync handler: it sends a payload or an `Error` instance

If the reply was hijacked, all subsequent steps are skipped. Otherwise, when
submitted, the data flow is as follows:

```
                        ★ schema validation Error
                                    │
                                    └─▶ schemaErrorFormatter
                                               │
                          reply sent ◀── JSON ─┴─ Error instance
                                                      │
                                                      │         ★ throw an Error
                     ★ send or return                 │                 │
                            │                         │                 │
                            │                         ▼                 │
       reply sent ◀── JSON ─┴─ Error instance ──▶ setErrorHandler ◀─────┘
                                                      │
                                 reply sent ◀── JSON ─┴─ Error instance ──▶ onError Hook
                                                                                │
                                                                                └─▶ reply sent
```

`reply sent` means the JSON payload will be serialized by one of the following:
- The [reply serializer](./Server.md#setreplyserializer) if set
- The [serializer compiler](./Server.md#setserializercompiler) if a JSON schema
  is set for the HTTP status code
- The default `JSON.stringify` function