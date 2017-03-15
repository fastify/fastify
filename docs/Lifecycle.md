<h1 align="center">Fastify</h1>

## Lifecycle
Following the schema of the internal lifecycle of Fastify.  
On the right branch of every section there is the next phase of the lifecycle, on the left branch there is the corresponding error code that will be generated if the parent throws an error *(note that all the errors are automatically handled by Fastify)*.
```
Incoming Request
  │
  └─▶ Instance Logger
        │
        └─▶ onRequest Hook
              │
        500 ◀─┴─▶ run Middlewares
                    │
              500 ◀─┴─▶ preRouting Hook
                          │
                    500 ◀─┴─▶ Routing
                                │
                          404 ◀─┴─▶ Parsing
                                      │
                                415 ◀─┴─▶ Validation
                                            │
                                      400 ◀─┴─▶ preHandler Hook
                                                  │
                                            500 ◀─┴─▶ User Handler
                                                        │
                                                        └─▶ Reply
                                                              │
                                                              └─▶ Outgoing Response
```
