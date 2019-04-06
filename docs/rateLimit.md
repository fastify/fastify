<h1 align="center">Fastify</h1>

<a name="rateLimit"></a>
## Rate Limit

The Fastify module include a rate limit options compatible with redis, by default it's use the local memory. See [Server option "rateLimit"]().

This is an implementation of [fastify-rate-limit](https://github.com/fastify/fastify-rate-limit) in the core of Fastify, preventing the usage of additional hooks. 


<a name="rateLimit"></a>
### `rateLimit Object`

```js
{
  rateLimit : {
    max : 10,
    timeWindow : '1 minutes',
    prefixCache : 'prefix-service',
    whitelist : ['127.0.0.1'],
    keyGenerator: function(req) {
      return req.ip
    },
    onExceeding : function(req) {
      console.log('cb on exceededing ... executed before response to client. req is give as argument')
    },
    onExceeded : function(req) {
      console.log('cb on exceeded ... to black list ip in security group for example, req is given as argument')
    }
  }
}
```

<a name="max"></a>
### `max`

The number of max try allowed by the user. 

+ Default: `100`

<a name="prefixCache"></a>
### `prefixCache`

Prefix to use in redis. Each rule can have it's own prefix. By default the route will be use as the prefix, for example `/user/account` will become `user-account`.
 
 

+ Default: `url transformation`

```js
const fastify = require('fastify')({
  ignoreTrailingSlash: true
})

// registers both "/foo" and "/foo/"
fastify.get('/foo/', function (req, reply) {
  res.send('foo')
})

// registers both "/bar" and "/bar/"
fastify.get('/bar', function (req, reply) {
  res.send('bar')
})
```

<a name="whitelist"></a>
### `whitelist`

An array of ip or host that don't a rate limit even if they exceed it. 
For example `['127.0.0.1']`


<a name="keyGenerator"></a>
### `keyGenerator`

Defines the key to use additionally of the url. By default it's using the `ip` from `req.ip`.

+ Default: `req.ip` 

<a name="onExceeding"></a>
### `onExceeding`

Define a call back for when the user is exceeding the rate at this moment.

+ Default: `'none'`
<a name="onExceeded"></a>
### `onExceeded`

Define a call back for when the user exceeded the rate. It could be useful to black list the IP by making a api call again AAWS or GCLOUD 

+ Default: `'none'`
