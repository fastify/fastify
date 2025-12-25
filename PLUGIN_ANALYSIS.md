# Step-by-Step Analysis: Custom Logger Plugin

## Plugin Code
```javascript
const customLogger = {
  name: 'custom-logger',
  register: async (fastify, options) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.log.info({ 
        req: request,
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        ip: request.ip
      }, 'Custom Request Log')
      done()
    })
  }
}
```

---

## STEP-BY-STEP EXECUTION FLOW

### PHASE 1: SERVER INITIALIZATION

#### Step 1: Fastify Instance Creation
```
fastify({ logger: true, disableRequestLogging: true })
    │
    ▼
fastify.js:fastify() function executes
    │
    ├─► Validates options
    ├─► Creates logger via createLogger(options)
    │   └─► Returns Pino logger instance
    ├─► Builds router via buildRouting()
    ├─► Creates 404 handler via build404()
    └─► Returns Fastify instance object
```

**What happens:**
- `logger: true` → Creates a Pino logger instance
- `disableRequestLogging: true` → Sets flag to skip default "incoming request" logs
- Fastify instance is returned with `register()`, `addHook()`, etc. methods

---

#### Step 2: Plugin Registration
```
fastify.register(customLogger)
    │
    ▼
Avvio plugin system (fastify.js uses Avvio internally)
    │
    ├─► Calls customLogger.register(fastify, undefined)
    │   │
    │   └─► Executes: fastify.addHook('onRequest', ...)
    │       │
    │       ▼
    │   lib/hooks.js:Hooks.prototype.add()
    │       │
    │       ├─► Validates hook name ('onRequest')
    │       ├─► Validates function is provided
    │       └─► Pushes hook function to fastify[kHooks].onRequest array
    │
    └─► Plugin registration complete
```

**What happens:**
- `register()` is called by Avvio plugin system
- Your hook function is added to `fastify[kHooks].onRequest[]` array
- Hook is now stored and ready to execute on every request

**Key Point:** The hook function is **registered** but **not executed yet**. It's stored in memory waiting for requests.

---

### PHASE 2: REQUEST PROCESSING (When HTTP Request Arrives)

#### Step 3: HTTP Request Arrives
```
HTTP GET / → Node.js HTTP Server
    │
    ▼
lib/server.js:createServer() → httpHandler
    │
    ▼
fastify.js:wrapRouting() → router.routing()
    │
    ▼
find-my-way router matches route → routeHandler()
```

**What happens:**
- HTTP request arrives at Node.js server
- Routes through Fastify's routing system
- Finds matching route handler

---

#### Step 4: Request Object Creation
```
lib/route.js:routeHandler() (line 447)
    │
    ├─► Generate request ID: getGenReqId(context.server, req)
    │   └─► Returns unique ID (e.g., 'req-1')
    │
    ├─► Create child logger: createChildLogger(context, logger, req, id, loggerOpts)
    │   │
    │   └─► logger.child({ reqId: id }, loggerOpts)
    │       │
    │       └─► Returns Pino child logger instance
    │           │
    │           └─► THIS IS WHAT request.log WILL BE!
    │
    ├─► Create Request object: new context.Request(id, params, req, query, childLogger, context)
    │   │
    │   └─► lib/request.js:Request constructor
    │       │
    │       ├─► Sets this.log = childLogger ← YOUR LOGGER IS HERE!
    │       ├─► Sets this.id = id
    │       ├─► Sets this.method = req.method
    │       ├─► Sets this.url = req.url
    │       ├─► Sets this.ip = req.ip
    │       └─► All request properties initialized
    │
    └─► Create Reply object: new context.Reply(res, request, childLogger)
```

**Critical Understanding:**
- `request.log` = **childLogger** (Pino child logger instance)
- `request.log` **inherits ALL Pino logger methods**:
  - `info()`, `error()`, `debug()`, `warn()`, `trace()`, `fatal()`
  - `child()` (for nested loggers)
  - All Pino serializers and formatters
  - All log management properties

---

#### Step 5: Default Logging Check (Skipped)
```
lib/route.js:routeHandler() (line 502)
    │
    ├─► if (disableRequestLogging === false) {
    │       childLogger.info({ req: request }, 'incoming request')
    │   }
    │
    └─► SKIPPED because disableRequestLogging === true ✓
```

**What happens:**
- Fastify checks `disableRequestLogging` flag
- Since it's `true`, default logging is **skipped**
- No default "incoming request" log is written

---

#### Step 6: Hook Execution - Your Plugin Runs!
```
lib/route.js:routeHandler() (line 510)
    │
    ├─► if (context.onRequest !== null) {
    │       onRequestHookRunner(context.onRequest, request, reply, runPreParsing)
    │   }
    │
    ▼
lib/hooks.js:onRequestHookRunner() (line 276)
    │
    ├─► Calls hookRunnerGenerator() which returns hookRunner function
    │
    ├─► Executes each hook in context.onRequest array sequentially
    │   │
    │   └─► Your hook function is in this array!
    │
    ▼
Your Hook Function Executes:
    │
    fastify.addHook('onRequest', (request, reply, done) => {
    │   │
    │   ├─► request.log IS the childLogger created in Step 4
    │   │   └─► Inherits all Pino logger methods ✓
    │   │
    │   ├─► request.log.info({ ... }, 'Custom Request Log')
    │   │   │
    │   │   ├─► request → FastifyRequest object (full request context)
    │   │   ├─► timestamp → new Date().toISOString() (current time)
    │   │   ├─► method → request.method ('GET', 'POST', etc.)
    │   │   ├─► url → request.url ('/test', '/users', etc.)
    │   │   ├─► ip → request.ip (client IP address)
    │   │   │
    │   │   └─► Logs: { req: {...}, timestamp: '...', method: 'GET', url: '/', ip: '127.0.0.1' }
    │   │       │
    │   │       └─► Message: 'Custom Request Log'
    │   │
    │   └─► done() → Calls next hook or continues to runPreParsing
    │
    └─► Hook execution complete
```

**What happens:**
- `onRequestHookRunner` finds your hook in the `onRequest` array
- Calls your hook function with `(request, reply, done)`
- Your hook accesses `request.log` (the childLogger)
- `request.log.info()` executes → logs your custom message
- `done()` called → continues to next step

**Key Properties of `request.log`:**
- ✅ Inherits from Pino logger (all methods available)
- ✅ Has request ID bound (`reqId`)
- ✅ Has request serializers (formats `req` object automatically)
- ✅ Full log management system properties
- ✅ Can create nested loggers with `child()`
- ✅ All Pino features (levels, serializers, formatters)

---

#### Step 7: Request Processing Continues
```
After hook completes:
    │
    ├─► preParsing hooks (if any)
    ├─► handleRequest() → route handler execution
    ├─► preValidation hooks
    ├─► Validation (if schema)
    ├─► preHandler hooks
    ├─► Your route handler executes
    ├─► preSerialization hooks
    ├─► Serialize response
    ├─► onSend hooks
    └─► Response sent
```

---

## PROPERTIES INHERITED BY request.log

### From Pino Logger:
```javascript
request.log.info(obj, message)    // ✅ Available
request.log.error(obj, message)   // ✅ Available
request.log.debug(obj, message)   // ✅ Available
request.log.warn(obj, message)    // ✅ Available
request.log.trace(obj, message)   // ✅ Available
request.log.fatal(obj, message)   // ✅ Available
request.log.child(bindings)       // ✅ Available (nested loggers)
request.log.level                 // ✅ Available (current log level)
```

### From Fastify Child Logger:
```javascript
request.log[kDisableRequestLogging]  // ✅ Available (internal flag)
request.log.bindings                 // ✅ Available (reqId, etc.)
request.log.serializers              // ✅ Available (req, res, err serializers)
```

### From Request Object (in your hook):
```javascript
request.log.info({
  req: request,        // ✅ Full FastifyRequest object
  timestamp: '...',    // ✅ Your custom property
  method: request.method,  // ✅ 'GET', 'POST', etc.
  url: request.url,        // ✅ '/test', '/users', etc.
  ip: request.ip          // ✅ Client IP address
}, 'Custom Request Log')
```

---

## ENCAPSULATION EXPLANATION

### What "Encapsulated by childLogger" Means:

1. **Plugin Scope:**
   - Your plugin runs in Fastify's plugin context
   - Has access to Fastify instance methods (`addHook`, `register`, etc.)
   - Can access all Fastify features

2. **Logger Inheritance:**
   - `request.log` = childLogger instance
   - ChildLogger inherits from parent Pino logger
   - Gets all Pino methods + Fastify-specific features
   - Has request-specific bindings (reqId, etc.)

3. **Request Context:**
   - Your hook receives `request` object
   - `request.log` is **bound to this specific request**
   - Each request gets its own childLogger instance
   - Logs are automatically tagged with request ID

4. **Plugin Properties:**
   - Your plugin's hook function has access to:
     - `request.log` (the childLogger with all properties)
     - `request` (full FastifyRequest object)
     - `reply` (FastifyReply object)
     - All Fastify instance methods via closure

---

## COMPLETE EXECUTION EXAMPLE

### When Request Arrives:

```
1. HTTP Request: GET http://localhost:3000/
    │
2. Fastify routes to handler
    │
3. Creates childLogger with reqId: 'req-1'
    │
4. Creates Request object with request.log = childLogger
    │
5. Checks disableRequestLogging → SKIPS default log ✓
    │
6. Executes onRequest hooks:
    │
7. YOUR HOOK RUNS:
    │
   request.log.info({
     req: FastifyRequest {
       id: 'req-1',
       method: 'GET',
       url: '/',
       ip: '127.0.0.1',
       log: childLogger {...}  ← THIS IS request.log
     },
     timestamp: '2025-01-28T10:30:45.123Z',
     method: 'GET',
     url: '/',
     ip: '127.0.0.1'
   }, 'Custom Request Log')
    │
   Output:
   {
     "level": 30,
     "time": 1738066245123,
     "pid": 12345,
     "hostname": "Mac.local",
     "reqId": "req-1",        ← Auto-added by childLogger
     "req": {                 ← Serialized by Pino req serializer
       "method": "GET",
       "url": "/",
       "hostname": "localhost:3000",
       "remoteAddress": "127.0.0.1",
       "remotePort": 54321
     },
     "timestamp": "2025-01-28T10:30:45.123Z",  ← Your custom property
     "method": "GET",                             ← Your custom property
     "url": "/",                                  ← Your custom property
     "ip": "127.0.0.1",                          ← Your custom property
     "msg": "Custom Request Log"                 ← Your message
   }
    │
8. Request processing continues...
```

---

## SUMMARY

✅ **Plugin is registered** → Hook stored in `fastify[kHooks].onRequest[]`

✅ **Request arrives** → ChildLogger created per request

✅ **request.log = childLogger** → Inherits ALL log management properties

✅ **Your hook executes** → Uses `request.log.info()` with custom data

✅ **Encapsulation** → Plugin has access to full Fastify + Pino logging system

✅ **Default logging disabled** → Only your custom log appears

**The plugin object IS encapsulated by the childLogger because `request.log` (the childLogger) possesses and inherits all log management system properties, and your plugin hook function has full access to it!**







