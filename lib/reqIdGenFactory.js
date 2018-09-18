'use strict'

module.exports = function (requestIdHeader) {
  var maxInt = 2147483647
  var nextReqId = 0
  return function genReqId (req) {
    return req.headers[requestIdHeader] || (nextReqId = (nextReqId + 1) & maxInt)
  }
}
