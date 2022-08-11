'use strict'

module.exports = function (requestIdHeader, optGenReqId) {
  // 2,147,483,647 (2^31 − 1) stands for max SMI value (an internal optimization of V8).
  // With this upper bound, if you'll be generating 1k ids/sec, you're going to hit it in ~25 days.
  // This is very likely to happen in real-world applications, hence the limit is enforced.
  // Growing beyond this value will make the id generation slower and cause a deopt.
  // In the worst cases, it will become a float, losing accuracy.
  const maxInt = 2147483647
  let nextReqId = 0
  function defaultGenReqId (req) {
    nextReqId = (nextReqId + 1) & maxInt
    return `req-${nextReqId.toString(36)}`
  }

  const genReqId = optGenReqId || defaultGenReqId

  if (requestIdHeader) {
    // NOTE: when user sets requestIdHeader to true the behavior is the same as if it was set to false because `req.headers[true] || genReqId(req)` is equivalent to `genReqId(req)`. (req.headers[true] is undefined).
    // TL;DR requestIdHeader must be a string, else it will be 'ignored'.
    // Solution: Provide a default value for requestIdHeader when `true` or throw.
    return function (req) {
      return req.headers[requestIdHeader] || genReqId(req)
    }
  }

  return genReqId
}
