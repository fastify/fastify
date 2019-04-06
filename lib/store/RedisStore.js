'use strict'

const noop = () => {}

function RedisStore (redis, prefix) {
  this.redis = redis
  this.prefix = prefix
}

RedisStore.prototype.incr = function (key, timeWindow, cb) {
  const target = this.prefix + key
  this.redis.pipeline()
    .incr(target)
    .pttl(target)
    .exec((err, result) => {
      if (err) return cb(err, 0)
      if (result[0][0]) return cb(result[0][0], 0)
      if (result[1][1] === -1) {
        this.redis.pexpire(target, timeWindow, noop)
      }
      cb(null, result[0][1])
    })
}

module.exports = RedisStore
