'use strict'

function Request (params, req, body, query, log) {
  this.params = params
  this.req = req
  this.body = body
  this.query = query
  this.log = log
}

function buildRequest (R) {
  function _Request (params, req, body, query, log) {
    this.params = params
    this.req = req
    this.body = body
    this.query = query
    this.log = log
  }
  _Request.prototype = new R()
  return _Request
}

module.exports = Request
module.exports.buildRequest = buildRequest
