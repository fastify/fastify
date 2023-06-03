'use strict'

const numberLookupA = new Array(1296).fill(0).map((v, i) => i.toString(36))
const numberLookupB = numberLookupA.map(v => v.padStart(2, '0'))

module.exports = function (requestIdHeader, optGenReqId) {
  let numberLookup = numberLookupA
  let i = 1
  let sequence = 'req-'
  let sequenceNum = 0

  function defaultGenReqId (req) {
    if (i === 1296) {
      i = 0
      sequenceNum === 0 && (numberLookup = numberLookupB)
      sequence = `req-${(++sequenceNum).toString(36)}`
    }
    return sequence + numberLookup[i++]
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
