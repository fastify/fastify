'use strict'

const numberLookup = [
  '0', '1', '2', '3', '4', '5', '6',
  '7', '8', '9', 'a', 'b', 'c', 'd',
  'e', 'f', 'g', 'h', 'i', 'j', 'k',
  'l', 'm', 'n', 'o', 'p', 'q', 'r',
  's', 't', 'u', 'v', 'w', 'x', 'y',
  'z'
]

module.exports = function (requestIdHeader, optGenReqId) {
  let reqMajorCounter = 0
  let reqSubCounter = 1
  let prefix = 'req-'

  function defaultGenReqId (_request) {
    reqSubCounter === 36 && (prefix = `req-${(++reqMajorCounter).toString(36)}`, true) && (reqSubCounter = 0)
    return prefix + numberLookup[reqSubCounter++]
  }

  const genReqId = optGenReqId || defaultGenReqId

  if (requestIdHeader) {
    // requestIdHeader = typeof requestIdHeader === 'string' ? requestIdHeader : 'request-id'
    return function (req) {
      return req.headers[requestIdHeader] || genReqId(req)
    }
  }

  return genReqId
}
