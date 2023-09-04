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
  kSchemaController,
  kOptions,
  kRequestCacheValidateFns,
  kRouteContext,
  kPublicRouteContext,
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
    // Support plain true/false
    return function () { return true }
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
  const props = [...R.props]
  function _Request (id, params, req, query, log, context) {
    this.id = id
    this[kRouteContext] = context
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
  context: {
    get () {
      warning.emit('FSTDEP012')
      return this[kRouteContext]
    }
  },
  routerPath: {
    get () {
      warning.emit('FSTDEP017')
      return this[kRouteContext].config?.url
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
  routerMethod: {
    get () {
      warning.emit('FSTDEP018')
      return this[kRouteContext].config?.method
    }
  },
  routeConfig: {
    get () {
      warning.emit('FSTDEP016')
      return this[kRouteContext][kPublicRouteContext]?.config
    }
  },
  routeSchema: {
    get () {
      warning.emit('FSTDEP015')
      return this[kRouteContext][kPublicRouteContext].schema
    }
  },
  is404: {
    get () {
      return this[kRouteContext].config?.url === undefined
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
