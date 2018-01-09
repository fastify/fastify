'use strict'

/**
 * Map caches are used to store schemas and stringifiers for re-use. They take a
 * function and return a function with the same signature, but anytime the first
 * parameter matches one that has already been called, it returns the previous
 * call.
 *
 * For example:
 *
 * let calls = 0;
 * const cache = createMapCache(function (id, increment) {
 *   calls = calls + increment;
 *   return calls;
 * })
 *
 * cache.get('a', 1) // returns 1 - the function was called with ('a', 1)
 * cache.get('a', 2) // returns 1 - the cached value was used
 * cache.get('b', 3) // returns 4 - the function was called with ('b', 3)
 *
 * They should only be read from during bootstrapping.
 */
module.exports = function createMapCache (fetch) {
  const cache = new Map()

  return function get (id) {
    // copying arguments over to an array to avoid a performance cliff in Node 4 and 6
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) { args[i] = arguments[i] }

    if (id) {
      if (!cache.has(id)) {
        cache.set(id, fetch.apply(null, args))
      }
      return cache.get(id)
    } else {
      return fetch.apply(null, args)
    }
  }
}
