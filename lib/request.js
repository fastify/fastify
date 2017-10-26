'use strict'

// Copied from https://github.com/delvedor/find-my-way/blob/master/index.js#L378
function sanitizeUrl (url) {
  for (var i = 0, len = url.length; i < len; i++) {
    var charCode = url.charCodeAt(i)
    if (charCode === 63 || charCode === 35) {
      return url.slice(0, i)
    }
  }
  return url
}

function Request (params, req, body, query, headers, log) {
  this.params = params
  this.req = req
  this.body = body
  this.query = query
  this.headers = headers
  this.log = log
  this.path = req ? sanitizeUrl(req.url) : ''
}

function buildRequest (R) {
  function _Request (params, req, body, query, headers, log) {
    this.params = params
    this.req = req
    this.body = body
    this.query = query
    this.headers = headers
    this.log = log
    this.path = req ? sanitizeUrl(req.url) : ''
  }
  _Request.prototype = new R()
  return _Request
}

module.exports = Request
module.exports.buildRequest = buildRequest
