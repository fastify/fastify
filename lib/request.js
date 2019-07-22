'use strict'

function Request (params, req, query, headers, log, ip, ips, hostname) {
  this.params = params
  this.raw = req
  this.query = query
  this.headers = headers
  this.log = log
  this.body = null
  this.ip = ip
  this.ips = ips
  this.hostname = hostname
}

function buildRequest (R) {
  function _Request (params, req, query, headers, log, ip, ips, hostname) {
    this.params = params
    this.raw = req
    this.query = query
    this.headers = headers
    this.log = log
    this.body = null
    this.ip = ip
    this.ips = ips
    this.hostname = hostname
  }
  _Request.prototype = new R()

  return _Request
}

Object.defineProperties(Request.prototype, {
  req: {
    get: function () {
      return this.raw
    }
  },
  id: {
    get: function () {
      return this.raw.id
    }
  }
})

module.exports = Request
module.exports.buildRequest = buildRequest
