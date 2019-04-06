'use strict'

const noop = () => {}

function RedisStore (redis) {
  this.redis = redis
}

RedisStore.prototype.incr = function (prefix, key, timeWindow, cb) {
  let keyName = `${prefix}-${key}`

  this.redis.pipeline()
    .incr(keyName)
    .pttl(keyName)
    .exec((err, result) => {
      if (err) return cb(err, 0)
      if (result[0][0]) return cb(result[0][0], 0)
      if (result[1][1] === -1) {
        this.redis.pexpire(keyName, timeWindow, noop)
      }
      cb(null, result[0][1])
    })
}

module.exports = RedisStore
