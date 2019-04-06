'use strict'

const lru = require('tiny-lru')

function LocalStore (opts) {
  this.lru = lru(opts || 5000)
  this.timers = {}
}

LocalStore.prototype.incr = function (key, timeWindow, cb) {
  //
  // console.log('here')
  // console.log(key);

  let current = this.lru.get(key) || 0

  // console.log(current)
  this.lru.set(key, ++current)

  if (!this.timers[key]) {
    this.timers[key] = setTimeout(() => {
      this.lru.delete(key)
      this.timers[key] = null
    }, timeWindow)
  }

  cb(null, current)
}

LocalStore.prototype.getEnforce = function (url) {
  return this.lru.get(url)
}

LocalStore.prototype.setEnforce = function (url, bool) {
  return this.lru.set(`enforce-${url}`, bool)
}

LocalStore.prototype.isEnforce = function (url) {
  return this.lru.get(`enforce-${url}`)
}

module.exports = LocalStore
