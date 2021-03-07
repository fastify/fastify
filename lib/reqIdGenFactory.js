'use strict'

module.exports = function () {
  // 2,147,483,647 (2^31 − 1) stands for max SMI value (an internal optimization of V8).
  // With this upper bound, if you'll be generating 1k ids/sec, you're going to hit it in ~25 days.
  // This is very likely to happen in real-world applications, hence the limit is enforced.
  // Growing beyond this value will make the id generation slower and cause a deopt.
  // In the worst cases, it will become a float, losing accuracy.
  const maxInt = 2147483647
  let nextReqId = 0
  return function genReqId (req) {
    nextReqId = (nextReqId + 1) & maxInt
    return `req-${nextReqId.toString(36)}`
  }
}
