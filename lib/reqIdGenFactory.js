'use strict'

function patchNumberLookup (numberLookup) {
  for (let i = 0; i < 36; ++i) {
    numberLookup[i] = '0' + numberLookup[i]
  }
}

module.exports = function (requestIdHeader, optGenReqId) {
  const twoDigitPermutationCount = 36 ** 2
  const numberLookup = new Array(twoDigitPermutationCount).fill(0).map((v, i) => i.toString(36))
  let reqMajorCounter = 0
  let reqSubCounter = 1
  let prefix = 'req-'

  function defaultGenReqId (req) {
    if (reqSubCounter === twoDigitPermutationCount) {
      reqSubCounter = 0
      reqMajorCounter === 0 && patchNumberLookup(numberLookup)
      prefix = `req-${(++reqMajorCounter).toString(36)}`
    }
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
