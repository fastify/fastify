'use strict'

function Request (params, req, body, query, headers, logger) {
  this.params = params
  this.req = req
  this.body = body
  this.query = query
  this.headers = headers
  this.logger = logger
}

function buildRequest (R) {
  function _Request (params, req, body, query, headers, logger) {
    this.params = params
    this.req = req
    this.body = body
    this.query = query
    this.headers = headers
    this.logger = logger
  }
  _Request.prototype = new R()
  return _Request
}

module.exports = Request
module.exports.buildRequest = buildRequest
