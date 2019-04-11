'use strict'

module.exports = function () {
  var maxInt = 2147483647
  var nextReqId = 0
  return function genReqId (req) {
    return (nextReqId = (nextReqId + 1) & maxInt)
  }
}
