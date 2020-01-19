'use strict'

const { emitWarning } = require('./warnings')

function Request (id, params, req, query, headers, log, ip, ips, hostname) {
  this.id = id
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
  function _Request (id, params, req, query, headers, log, ip, ips, hostname) {
    this.id = id
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
    get () {
      emitWarning('FSTDEP001')
      return this.raw
    }
  },
  url: {
    get () {
      return this.raw.url
    }
  },
  method: {
    get () {
      return this.raw.method
    }
  },
  connection: {
    get () {
      return this.raw.connection
    }
  }
})

module.exports = Request
module.exports.buildRequest = buildRequest
