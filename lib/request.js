'use strict'

function Request (params, req, query, headers, log, ip, ips, hostname, trustProxy) {
  this.params = params
  this.raw = req
  this.query = query
  this.headers = headers
  this.log = log
  this.body = null
  this.ip = ip
  this.ips = ips
  this.hostname = hostname
  this.trustProxy = trustProxy
}

function buildRequest (R) {
  function _Request (params, req, query, headers, log, ip, ips, hostname, trustProxy) {
    this.params = params
    this.raw = req
    this.query = query
    this.headers = headers
    this.log = log
    this.body = null
    this.ip = ip
    this.ips = ips
    this.hostname = hostname
    this.trustProxy = trustProxy
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
  },
  protocol: {
    get: function () {
      // https://nodejs.org/api/tls.html#tls_tlssocket_encrypted
      const protocol = this.raw.socket.encrypted ? 'https' : 'http'
      if (this.trustProxy && this.headers['x-forwarded-proto']) {
        const [forwardedProto] = this.headers['x-forwarded-proto'].split(',')
        return forwardedProto || protocol
      }
      return protocol
    }
  }
})

module.exports = Request
module.exports.buildRequest = buildRequest
