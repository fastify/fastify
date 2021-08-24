<h1 align="center">Fastify</h1>

## Lifecycle
Following the schema of the internal lifecycle of Fastify.<br>
On the right branch of every section there is the next phase of the lifecycle, on the left branch there is the corresponding error code that will be generated if the parent throws an error *(note that all the errors are automatically handled by Fastify)*.

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

At any point before or during the `User Handler`, `reply.hijack()` can be called to prevent Fastify from:
- Running all the following hooks and user handler
- Sending the response automatically

NB (*): If `reply.raw` is used to send a response back to the user, `onResponse` hooks will still be executed

## Reply Lifecycle

Whenever the user handles the request, the result may be:

- in async handler: it returns a payload
- in async handler: it throws an `Error`
- in sync handler: it sends a payload
- in sync handler: it sends an `Error` instance

If the reply was hijacked, we skip all the below steps. Otherwise, when it is being submitted, the data flow performed is the following:

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

Note: `reply sent` means that the JSON payload will be serialized by:

- the [reply serialized](Server.md#setreplyserializer) if set
- or by the [serializer compiler](Server.md#setserializercompiler) when a JSON schema has been set for the returning HTTP status code
- or by the default `JSON.stringify` function
