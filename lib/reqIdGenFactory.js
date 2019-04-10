'use strict'

module.exports = function (requestIdHeader, userGenReqIdFunc) {
  if (userGenReqIdFunc) {
    return function genReqId (req) {
      return req.headers[requestIdHeader] || userGenReqIdFunc(req)
    }
  }
  var maxInt = 2147483647
  var nextReqId = 0
  return function genReqId (req) {
    return req.headers[requestIdHeader] || (nextReqId = (nextReqId + 1) & maxInt)
  }
}
