'use strict'

const proxyAddr = require('proxy-addr')
const semver = require('semver')
const warning = require('./warnings')
const {
  kHasBeenDecorated,
  kSchemaBody,
  kSchemaHeaders,
  kSchemaParams,
  kSchemaQuerystring,
  kSchemaResponse,
  kSchemaController,
  kOptions
} = require('./symbols')

const HTTP_PART_SYMBOL_MAP = {
  body: kSchemaBody,
  headers: kSchemaHeaders,
  params: kSchemaParams,
  querystring: kSchemaQuerystring
}

function Request (id, params, req, query, log, context) {
  this.id = id
  this.context = context
  this.params = params
  this.raw = req
  this.query = query
  this.log = log
  this.body = undefined
}
Request.props = []

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
  return proxyAddr.compile(tp)
}

function buildRequest (R, trustProxy) {
  if (trustProxy) {
    return buildRequestWithTrustProxy(R, trustProxy)
  }

  return buildRegularRequest(R)
}

function buildRegularRequest (R) {
  const props = [...R.props]
  function _Request (id, params, req, query, log, context) {
    this.id = id
    this.context = context
    this.params = params
    this.raw = req
    this.query = query
    this.log = log
    this.body = undefined

    // eslint-disable-next-line no-var
    var prop
    // eslint-disable-next-line no-var
    for (var i = 0; i < props.length; i++) {
      prop = props[i]
      this[prop.key] = prop.value
    }
  }
  Object.setPrototypeOf(_Request.prototype, R.prototype)
  Object.setPrototypeOf(_Request, R)
  _Request.props = props
  _Request.parent = R

  return _Request
}

function getLastEntryInMultiHeaderValue (headerValue) {
  // we use the last one if the header is set more than once
  const lastIndex = headerValue.lastIndexOf(',')
  return lastIndex === -1 ? headerValue.trim() : headerValue.slice(lastIndex + 1).trim()
}

function buildRequestWithTrustProxy (R, trustProxy) {
  const _Request = buildRegularRequest(R)
  const proxyFn = getTrustProxyFn(trustProxy)

  // This is a more optimized version of decoration
  _Request[kHasBeenDecorated] = true

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
          return getLastEntryInMultiHeaderValue(this.headers['x-forwarded-host'])
        }
        return this.headers.host || this.headers[':authority']
      }
    },
    protocol: {
      get () {
        if (this.headers['x-forwarded-proto']) {
          return getLastEntryInMultiHeaderValue(this.headers['x-forwarded-proto'])
        }
        if (this.socket) {
          return this.socket.encrypted ? 'https' : 'http'
        }
      }
    }
  })

  return _Request
}

Object.defineProperties(Request.prototype, {
  server: {
    get () {
      return this.context.server
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
      /* istanbul ignore next */
      if (semver.gte(process.versions.node, '13.0.0')) {
        warning.emit('FSTDEP005')
      }
      return this.raw.connection
    }
  },
  socket: {
    get () {
      return this.raw.socket
    }
  },
  ip: {
    get () {
      if (this.socket) {
        return this.socket.remoteAddress
      }
    }
  },
  hostname: {
    get () {
      return this.raw.headers.host || this.raw.headers[':authority']
    }
  },
  protocol: {
    get () {
      if (this.socket) {
        return this.socket.encrypted ? 'https' : 'http'
      }
    }
  },
  headers: {
    get () {
      if (this.additionalHeaders) {
        return Object.assign({}, this.raw.headers, this.additionalHeaders)
      }
      return this.raw.headers
    },
    set (headers) {
      this.additionalHeaders = headers
    }
  },
  // TODO: benchmark the two different approaches
  /**
   * Pending: In case the schema is not provided, we need to build the
   * Validation compilers from SchemaController, similar to lib/route#L309
   * and lib/route#L318
   */
  validate: {
    value: function (schema, input, httpPart) {
      // console.log(this.context)
      const { method, url } = this
      const symbol = httpPart != null && HTTP_PART_SYMBOL_MAP[httpPart]
      let validate = null

      // process._rawDebug('Request Context', this.context)
      if (symbol) {
        validate = this.context[symbol]
      }

      if (validate == null) {
        const { validatorCompiler } = this.context.routeOptions

        // If the SchemaController has not been set for the request
        // We prepare it here and use it right away
        if (validatorCompiler == null) {
          this.server[kSchemaController].setupValidator(this.server[kOptions])
          this.context.routeOptions.validatorCompiler = this.server[kSchemaController].validatorCompiler
        }

        validate = this.context.routeOptions.validatorCompiler({ schema, method, url, httpPart })
      }

      return input != null ? validate(input) : validate
    }
  },
  serialize (schema, input, httpStatus) {
    // console.log(this.context)
    const { method, url } = this
    let serialize = null

    // process._rawDebug('Request Context', this.context)
    if (httpStatus != null) {
      serialize = this.context[kSchemaResponse][httpStatus]
    }

    if (serialize == null) {
      serialize = this.context.routeOptions.serializerCompiler({ schema, method, url, httpStatus })
    }

    return input != null ? serialize(input) : serialize
  }
})

module.exports = Request
module.exports.buildRequest = buildRequest
