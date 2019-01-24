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
       404 ◀─┴─▶ onRequest Hook
                  │
        4**/5** ◀─┴─▶ run Middlewares
                        │
              4**/5** ◀─┴─▶ preParsing Hook
                              │
                    4**/5** ◀─┴─▶ Parsing
                                   │
                         4**/5** ◀─┴─▶ preValidation Hook
                                        │
                                  415 ◀─┴─▶ Validation
                                              │
                                        400 ◀─┴─▶ preHandler Hook
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
