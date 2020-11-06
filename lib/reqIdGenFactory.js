'use strict'

module.exports = function () {
  const maxInt = 2147483647
  let nextReqId = 0
  return function genReqId (req) {
    return (nextReqId = (nextReqId + 1) & maxInt)
  }
}
