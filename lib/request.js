'use strict'

const net = require('net')

const proxyAddr = require('proxy-addr')
const {
  kHasBeenDecorated,
  kSchemaBody,
  kSchemaHeaders,
  kSchemaParams,
  kSchemaQuerystring,
  kSchemaController,
  kOptions,
  kRequestCacheValidateFns,
  kRouteContext,
  kRequestOriginalUrl
} = require('./symbols')
const { FST_ERR_REQ_INVALID_VALIDATION_INVOCATION } = require('./errors')

const HTTP_PART_SYMBOL_MAP = {
  body: kSchemaBody,
  headers: kSchemaHeaders,
  params: kSchemaParams,
  querystring: kSchemaQuerystring,
  query: kSchemaQuerystring
}

function Request (id, params, req, query, log, context) {
  this.id = id
  this[kRouteContext] = context
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
    // Support trusting everything
    return null
  }
  if (typeof tp === 'number') {
    // Support trusting hop count
    return function (a, i) { return i < tp }
  }
  if (typeof tp === 'string') {
    // Support comma-separated tps
    const values = tp.split(',').map(it => it.trim())
    return proxyAddr.compile(values)
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
  const props = R.props.slice()
  function _Request (id, params, req, query, log, context) {
    this.id = id
    this[kRouteContext] = context
    this.params = params
    this.raw = req
    this.query = query
    this.log = log
    this.body = undefined

    let prop
    for (let i = 0; i < props.length; i++) {
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
        const addrs = proxyAddr.all(this.raw, proxyFn)
        return addrs[addrs.length - 1]
      }
    },
    ips: {
      get () {
        return proxyAddr.all(this.raw, proxyFn)
      }
    },
    host: {
      get () {
        if (this.ip !== undefined && this.headers['x-forwarded-host']) {
          return getLastEntryInMultiHeaderValue(this.headers['x-forwarded-host'])
        }
        let host = this.headers.host ?? this.headers[':authority']
        // support http.requireHostHeader === false
        if (this.server.server.requireHostHeader === false) host ??= ''
        return host
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

function isValidHostname (hostname) {
  if (!hostname) {
    return false
  }
  if (net.isIP(hostname)) {
    return true
  }
  return /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*(?<!-)$/.test(hostname)
}

function parsePortPart (strippedHost) {
  /* No port part */
  if (!strippedHost) {
    return null
  }

  /* Ensure everything is a digit (includes preventing multiple port separators) */
  if (!/^\d+$/.test(strippedHost)) {
    return null
  }

  const port = Number.parseInt(strippedHost)

  /* Ensure port is a valid number */
  if (!port || Number.isNaN(port) || port < 0 || port > 65535) {
    return null
  }

  return port
}

function parseHostnameFromHost (host) {
  /* Account for `requireHostHeader` set to `false` in Node.js */
  if (!host) {
    return ''
  }

  const v6OpenBracketIndex = host.indexOf('[')
  const v6CloseBracketIndex = host.indexOf(']')

  /* IPv6-specific behavior */

  if (v6OpenBracketIndex !== -1 || v6CloseBracketIndex !== -1) {
    /* Missing brackets */
    if (v6OpenBracketIndex === -1 || v6CloseBracketIndex === -1) {
      return ''
    }

    const parts = [host.slice(1, v6CloseBracketIndex), host.slice(v6CloseBracketIndex + 2)]

    /* Invalid hostname */
    if (!isValidHostname(parts[0])) {
      return ''
    }

    /* Invalid port, if one is given */
    if (host.length > v6CloseBracketIndex + 1 && !parsePortPart(parts[1])) {
      return ''
    }

    /* Return the IPv6 address without brackets */
    return parts[0]
  }

  /* Standard behavior */

  const firstColonIndex = host.indexOf(':')
  const lastColonIndex = host.lastIndexOf(':')

  /* Multiple port separators */
  if (firstColonIndex !== lastColonIndex) {
    return ''
  }

  /* No hostname */
  if (firstColonIndex === 0) {
    return ''
  }

  /* No port separator */
  if (firstColonIndex === -1) {
    if (!isValidHostname(host)) {
      return ''
    }

    return host
  }

  const parts = [host.slice(0, firstColonIndex), host.slice(firstColonIndex + 1)]

  /* Invalid port, if one is given */
  if (firstColonIndex !== -1 && !parsePortPart(parts[1])) {
    return ''
  }

  /* Invalid hostname */
  if (!isValidHostname(parts[0])) {
    return ''
  }

  return parts[0]
}

function parsePortFromHost (host) {
  /* Account for `requireHostHeader` set to `false` in Node.js */
  if (!host) {
    return null
  }

  const v6OpenBracketIndex = host.indexOf('[')
  const v6CloseBracketIndex = host.indexOf(']')

  /* IPv6-specific behavior */

  if (v6OpenBracketIndex !== -1 || v6CloseBracketIndex !== -1) {
    /* Missing brackets */
    if (v6OpenBracketIndex === -1 || v6CloseBracketIndex === -1) {
      return ''
    }

    /* No port specified */
    if (v6CloseBracketIndex === host.length - 1) {
      return null
    }

    /* No port separator */
    if (host[v6CloseBracketIndex + 1] !== ':') {
      return null
    }

    const parts = [host.slice(1, v6CloseBracketIndex), host.slice(v6CloseBracketIndex + 2)]

    /* Invalid IPv6 address */
    if (parts[0] && net.isIP(parts[0]) !== 6) {
      return null
    }

    return parsePortPart(parts[1])
  }

  /* Standard behavior */

  const firstColonIndex = host.indexOf(':')
  const lastColonIndex = host.lastIndexOf(':')

  /* No port separator */
  if (firstColonIndex === -1) {
    return null
  }

  /* Multiple port separators */
  if (firstColonIndex !== lastColonIndex) {
    return null
  }

  const parts = [host.slice(0, firstColonIndex), host.slice(firstColonIndex + 1)]

  /* Invalid hostname */
  if (!parseHostnameFromHost(parts[0])) {
    return null
  }

  return parsePortPart(parts[1])
}

Object.defineProperties(Request.prototype, {
  server: {
    get () {
      return this[kRouteContext].server
    }
  },
  url: {
    get () {
      return this.raw.url
    }
  },
  originalUrl: {
    get () {
      /* istanbul ignore else */
      if (!this[kRequestOriginalUrl]) {
        this[kRequestOriginalUrl] = this.raw.originalUrl || this.raw.url
      }
      return this[kRequestOriginalUrl]
    }
  },
  method: {
    get () {
      return this.raw.method
    }
  },
  routeOptions: {
    get () {
      const context = this[kRouteContext]
      const routeLimit = context._parserOptions.limit
      const serverLimit = context.server.initialConfig.bodyLimit
      const version = context.server.hasConstraintStrategy('version') ? this.raw.headers['accept-version'] : undefined
      const options = {
        method: context.config?.method,
        url: context.config?.url,
        bodyLimit: (routeLimit || serverLimit),
        attachValidation: context.attachValidation,
        logLevel: context.logLevel,
        exposeHeadRoute: context.exposeHeadRoute,
        prefixTrailingSlash: context.prefixTrailingSlash,
        handler: context.handler,
        version
      }

      Object.defineProperties(options, {
        config: {
          get: () => context.config
        },
        schema: {
          get: () => context.schema
        }
      })

      return Object.freeze(options)
    }
  },
  is404: {
    get () {
      return this[kRouteContext].config?.url === undefined
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
  host: {
    get () {
      let host = this.raw.headers.host ?? this.raw.headers[':authority']
      // support http.requireHostHeader === false
      if (this.server.server.requireHostHeader === false) host ??= ''
      return host
    }
  },
  hostname: {
    get () {
      return parseHostnameFromHost(this.host) ||
        parseHostnameFromHost(this.headers.host) ||
        parseHostnameFromHost(this.headers[':authority'])
    }
  },
  port: {
    get () {
      return parsePortFromHost(this.host) ||
        parsePortFromHost(this.headers.host) ||
        parsePortFromHost(this.headers[':authority'])
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
  getValidationFunction: {
    value: function (httpPartOrSchema) {
      if (typeof httpPartOrSchema === 'string') {
        const symbol = HTTP_PART_SYMBOL_MAP[httpPartOrSchema]
        return this[kRouteContext][symbol]
      } else if (typeof httpPartOrSchema === 'object') {
        return this[kRouteContext][kRequestCacheValidateFns]?.get(httpPartOrSchema)
      }
    }
  },
  compileValidationSchema: {
    value: function (schema, httpPart = null) {
      const { method, url } = this

      if (this[kRouteContext][kRequestCacheValidateFns]?.has(schema)) {
        return this[kRouteContext][kRequestCacheValidateFns].get(schema)
      }

      const validatorCompiler = this[kRouteContext].validatorCompiler ||
        this.server[kSchemaController].validatorCompiler ||
        (
          // We compile the schemas if no custom validatorCompiler is provided
          // nor set
          this.server[kSchemaController].setupValidator(this.server[kOptions]) ||
          this.server[kSchemaController].validatorCompiler
        )

      const validateFn = validatorCompiler({
        schema,
        method,
        url,
        httpPart
      })

      // We create a WeakMap to compile the schema only once
      // Its done lazily to avoid add overhead by creating the WeakMap
      // if it is not used
      // TODO: Explore a central cache for all the schemas shared across
      // encapsulated contexts
      if (this[kRouteContext][kRequestCacheValidateFns] == null) {
        this[kRouteContext][kRequestCacheValidateFns] = new WeakMap()
      }

      this[kRouteContext][kRequestCacheValidateFns].set(schema, validateFn)

      return validateFn
    }
  },
  validateInput: {
    value: function (input, schema, httpPart) {
      httpPart = typeof schema === 'string' ? schema : httpPart

      const symbol = (httpPart != null && typeof httpPart === 'string') && HTTP_PART_SYMBOL_MAP[httpPart]
      let validate

      if (symbol) {
        // Validate using the HTTP Request Part schema
        validate = this[kRouteContext][symbol]
      }

      // We cannot compile if the schema is missed
      if (validate == null && (schema == null ||
        typeof schema !== 'object' ||
        Array.isArray(schema))
      ) {
        throw new FST_ERR_REQ_INVALID_VALIDATION_INVOCATION(httpPart)
      }

      if (validate == null) {
        if (this[kRouteContext][kRequestCacheValidateFns]?.has(schema)) {
          validate = this[kRouteContext][kRequestCacheValidateFns].get(schema)
        } else {
          // We proceed to compile if there's no validate function yet
          validate = this.compileValidationSchema(schema, httpPart)
        }
      }

      return validate(input)
    }
  }
})

module.exports = Request
module.exports.buildRequest = buildRequest
