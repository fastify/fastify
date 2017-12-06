'use strict'

module.exports = function createMapCache (fetch, fallback) {
  const cache = new Map()

  return function get (id) {
    if (id) {
      if (!cache.has(id)) {
        cache.set(id, fetch.apply(null, arguments))
      }
      return cache.get(id)
    } else {
      return (fallback || fetch).apply(null, arguments)
    }
  }
}
