# Lifecycle

Following the schema of the internal lifecycle of Fastify.
On the right branch of every section there is the next phase of the lifecycle, on the left branch there is the corresponding error code that will be generated if the parent throws an error *(note that all the errors are automatically handled by Fastify)*.
```
Incoming Request
  │
  └─▶ Instance Logger
        │
        └─▶ onRequest Hook
              │
    4**/5** ◀─┴─▶ run Middlewares
                    │
          4**/5** ◀─┴─▶ preRouting Hook
                          │
                4**/5** ◀─┴─▶ Routing
                                │
                          404 ◀─┴─▶ Parsing
                                      │
                                415 ◀─┴─▶ Validation
                                            │
                                      400 ◀─┴─▶ preHandler Hook
                                                  │
                                        4**/5** ◀─┴─▶ beforeHandler
                                                        │
                                              4**/5** ◀─┴─▶ User Handler
                                                              │
                                                              └─▶ Reply
                                                                    │
                                                                    └─▶ Outgoing Response
```
