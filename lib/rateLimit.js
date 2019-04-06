'use strict'
const ms = require('ms')
const path = require('path')
const LocalStore = require(path.join(__dirname, '/store/LocalStore'))
const RedisStore = require(path.join(__dirname, '/store/RedisStore'))
const FJS = require('fast-json-stringify')

const serializeError = FJS({
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' }
  }
})

const rateLimiter = function (rule) {
  const globalTimeWindow = typeof rule.timeWindow === 'string'
    ? ms(rule.timeWindow)
    : typeof rule.timeWindow === 'number'
      ? rule.timeWindow
      : 1000 * 60

  const prefix = rule.prefixCache || `${rule.path.replace(/\//g, '-').slice(1)}-`

  const store = rule.redis
    ? new RedisStore(rule.redis, rule.separator)
    : new LocalStore(rule.cache)

  const skipOnError = rule.skipOnError === true
  const max = rule.max || 1000
  const whitelist = rule.whitelist || []
  const after = ms(globalTimeWindow, { long: true })

  const keyGenerator = typeof rule.keyGenerator === 'function'
    ? rule.keyGenerator
    : (req) => req.ip

  return {
    onRateLimit: function (req, res, next) {
      var key = keyGenerator(req)

      if (whitelist.indexOf(key) > -1) {
        next()
      } else {
        store.incr(prefix, key, globalTimeWindow, onIncr)
      }

      function onIncr (err, current) {
        if (err && skipOnError === false) return next(err)

        if (current <= max) {
          res.setHeader('X-RateLimit-Limit', max)
          res.setHeader('X-RateLimit-Remaining', max - current)

          if (typeof rule.onExceeding === 'function') {
            rule.onExceeding(req)
          }

          next()
        } else {
          const body = serializeError({
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Rate limit exceeded, retry in ${after}`
          })

          if (typeof rule.onExceeded === 'function') {
            rule.onExceeded(req)
          }

          res.writeHead(429, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'X-RateLimit-Limit': max,
            'X-RateLimit-Remaining': 0,
            'Retry-After': globalTimeWindow
          }).end(body)
        }
      }
    }
  }
}

module.exports = function (rule) { return rateLimiter(rule).onRateLimit }
