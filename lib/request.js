'use strict'

function Request (params, req, query, headers, log) {
  this.params = params
  this.raw = req
  this.query = query
  this.headers = headers
  this.log = log
  this.body = null
}

function buildRequest (R) {
  function _Request (params, req, query, headers, log) {
    this.params = params
    this.raw = req
    this.query = query
    this.headers = headers
    this.log = log
    this.body = null
  }
  _Request.prototype = new R()

  return _Request
}

Object.defineProperty(Request.prototype, 'req', {
  get: function () {
    return this.raw
  }
})

Object.defineProperty(Request.prototype, 'id', {
  get: function () {
    return this.raw.id
  }
})

module.exports = Request
module.exports.buildRequest = buildRequest
