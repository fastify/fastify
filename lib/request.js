'use strict'

function Request (params, req, query, headers, log) {
  this.params = params
  this.req = req
  this.query = query
  this.headers = headers
  this.log = log
  this.body = null
}

function buildRequest (R) {
  function _Request (params, req, query, headers, log) {
    this.params = params
    this.req = req
    this.query = query
    this.headers = headers
    this.log = log
    this.body = null
  }
  _Request.prototype = new R()
  return _Request
}

module.exports = Request
module.exports.buildRequest = buildRequest
