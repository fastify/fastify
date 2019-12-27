'use strict'

var warningEmitted = false

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
    get () {
      if (warningEmitted === true) {
        return this.raw
      }
      warningEmitted = true
      const warn = new Error('You are accessing the Node.js core request object via "request.req", Use "request.raw" instead.')
      warn.name = 'FastifyDeprecation'
      warn.code = 'FST_WARN'
      process.emitWarning(warn)
      return this.raw
    }
  },
  id: {
    get () {
      return this.raw.id
    }
  }
})

module.exports = Request
module.exports.buildRequest = buildRequest
