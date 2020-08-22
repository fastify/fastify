'use strict'

const proxyAddr = require('proxy-addr')
const warning = require('./warnings')

function Request (id, params, req, query, log, context) {
  this.id = id
  this.context = context
  this.params = params
  this.raw = req
  this.query = query
  this.log = log
  this.body = null
}

function getTrustProxyFn (tp) {
  if (typeof tp === 'function') {
    return tp
  }
  if (tp === true) {
    // Support plain true/false
    return function () { return true }
  }
  if (typeof tp === 'number') {
    // Support trusting hop count
    return function (a, i) { return i < tp }
  }
  if (typeof tp === 'string') {
    // Support comma-separated tps
    const vals = tp.split(',').map(it => it.trim())
    return proxyAddr.compile(vals)
  }
  return proxyAddr.compile(tp || [])
}

function buildRequest (R, trustProxy) {
  if (trustProxy) {
    return buildRequestWithTrustProxy(R, trustProxy)
  }

  return buildRegularRequest(R)
}

function buildRegularRequest (R) {
  function _Request (id, params, req, query, log, context) {
    this.id = id
    this.context = context
    this.params = params
    this.raw = req
    this.query = query
    this.log = log
    this.body = null
  }
  _Request.prototype = new R()

  return _Request
}

function buildRequestWithTrustProxy (R, trustProxy) {
  const _Request = buildRegularRequest(R)
  const proxyFn = getTrustProxyFn(trustProxy)

  Object.defineProperties(_Request.prototype, {
    ip: {
      get () {
        return proxyAddr(this.raw, proxyFn)
      }
    },
    ips: {
      get () {
        return proxyAddr.all(this.raw, proxyFn)
      }
    },
    hostname: {
      get () {
        if (this.ip !== undefined && this.headers['x-forwarded-host']) {
          return this.headers['x-forwarded-host']
        }
        return this.headers.host || this.headers[':authority']
      }
    }
  })

  return _Request
}

Object.defineProperties(Request.prototype, {
  req: {
    get () {
      warning.emit('FSTDEP001')
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
  routerPath: {
    get () {
      return this.context.config.url
    }
  },
  routerMethod: {
    get () {
      return this.context.config.method
    }
  },
  is404: {
    get () {
      return this.context.config.url === undefined
    }
  },
  connection: {
    get () {
      return this.raw.connection
    }
  },
  ip: {
    get () {
      return this.connection.remoteAddress
    }
  },
  hostname: {
    get () {
      return this.raw.headers.host || this.raw.headers[':authority']
    }
  },
  headers: {
    get () {
      return this.raw.headers
    }
  }
})

module.exports = Request
module.exports.buildRequest = buildRequest
