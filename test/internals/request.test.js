'use strict'

const { test } = require('tap')

const Request = require('../../lib/request')
const Context = require('../../lib/context')
const {
  kReply,
  kRequest,
  kOptions
} = require('../../lib/symbols')

process.removeAllListeners('warning')

test('Regular request', t => {
  const headers = {
    host: 'hostname'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const context = new Context({
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    config: {
      some: 'config',
      url: req.url,
      method: req.method
    },
    server: {
      [kReply]: {},
      [kRequest]: Request,
      [kOptions]: {
        requestIdLogLabel: 'reqId'
      }
    }
  })
  req.connection = req.socket
  const request = new Request('id', 'params', req, 'query', 'log', context)
  t.type(request, Request)
  t.type(request.validateInput, Function)
  t.type(request.getValidationFunction, Function)
  t.type(request.compileValidationSchema, Function)
  t.equal(request.id, 'id')
  t.equal(request.params, 'params')
  t.equal(request.raw, req)
  t.equal(request.query, 'query')
  t.equal(request.headers, headers)
  t.equal(request.log, 'log')
  t.equal(request.ip, 'ip')
  t.equal(request.ips, undefined)
  t.equal(request.host, 'hostname')
  t.equal(request.body, undefined)
  t.equal(request.method, 'GET')
  t.equal(request.url, '/')
  t.equal(request.originalUrl, '/')
  t.equal(request.socket, req.socket)
  t.equal(request.protocol, 'http')
  // Aim to not bad property keys (including Symbols)
  t.notOk('undefined' in request)

  t.end()
})

test('Request with undefined config', t => {
  const headers = {
    host: 'hostname'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const context = new Context({
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    server: {
      [kReply]: {},
      [kRequest]: Request,
      [kOptions]: {
        requestIdLogLabel: 'reqId'
      }
    }
  })
  req.connection = req.socket
  const request = new Request('id', 'params', req, 'query', 'log', context)
  t.type(request, Request)
  t.type(request.validateInput, Function)
  t.type(request.getValidationFunction, Function)
  t.type(request.compileValidationSchema, Function)
  t.equal(request.id, 'id')
  t.equal(request.params, 'params')
  t.equal(request.raw, req)
  t.equal(request.query, 'query')
  t.equal(request.headers, headers)
  t.equal(request.log, 'log')
  t.equal(request.ip, 'ip')
  t.equal(request.ips, undefined)
  t.equal(request.hostname, 'hostname')
  t.equal(request.body, undefined)
  t.equal(request.method, 'GET')
  t.equal(request.url, '/')
  t.equal(request.originalUrl, '/')
  t.equal(request.socket, req.socket)
  t.equal(request.protocol, 'http')

  // Aim to not bad property keys (including Symbols)
  t.notOk('undefined' in request)

  t.end()
})

test('Regular request - hostname from authority', t => {
  t.plan(3)
  const headers = {
    ':authority': 'authority'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }

  const request = new Request('id', 'params', req, 'query', 'log')
  t.type(request, Request)
  t.equal(request.host, 'authority')
  t.equal(request.port, null)
})

test('Regular request - host header has precedence over authority', t => {
  t.plan(3)
  const headers = {
    host: 'hostname',
    ':authority': 'authority'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const request = new Request('id', 'params', req, 'query', 'log')
  t.type(request, Request)
  t.equal(request.host, 'hostname')
  t.equal(request.port, null)
})

test('Request with trust proxy', t => {
  t.plan(18)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'example.com'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const context = new Context({
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    config: {
      some: 'config',
      url: req.url,
      method: req.method
    },
    server: {
      [kReply]: {},
      [kRequest]: Request,
      [kOptions]: {
        requestIdLogLabel: 'reqId'
      }
    }
  })

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log', context)
  t.type(request, TpRequest)
  t.equal(request.id, 'id')
  t.equal(request.params, 'params')
  t.same(request.raw, req)
  t.equal(request.query, 'query')
  t.equal(request.headers, headers)
  t.equal(request.log, 'log')
  t.equal(request.ip, '2.2.2.2')
  t.same(request.ips, ['ip', '1.1.1.1', '2.2.2.2'])
  t.equal(request.host, 'example.com')
  t.equal(request.body, undefined)
  t.equal(request.method, 'GET')
  t.equal(request.url, '/')
  t.equal(request.socket, req.socket)
  t.equal(request.protocol, 'http')
  t.type(request.validateInput, Function)
  t.type(request.getValidationFunction, Function)
  t.type(request.compileValidationSchema, Function)
})

test('Request with trust proxy, encrypted', t => {
  t.plan(2)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'example.com'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip', encrypted: true },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.type(request, TpRequest)
  t.equal(request.protocol, 'https')
})

test('Request with trust proxy - no x-forwarded-host header', t => {
  t.plan(2)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    host: 'hostname'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.type(request, TpRequest)
  t.equal(request.host, 'hostname')
})

test('Request with trust proxy - no x-forwarded-host header and fallback to authority', t => {
  t.plan(2)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    ':authority': 'authority'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.type(request, TpRequest)
  t.equal(request.host, 'authority')
})

test('Request with trust proxy - x-forwarded-host header has precedence over host', t => {
  t.plan(2)
  const headers = {
    'x-forwarded-for': ' 2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'example.com',
    host: 'hostname'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.type(request, TpRequest)
  t.equal(request.host, 'example.com')
})

test('Request with trust proxy - handles multiple entries in x-forwarded-host/proto', t => {
  t.plan(3)
  const headers = {
    'x-forwarded-host': 'example2.com, example.com',
    'x-forwarded-proto': 'http, https'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.type(request, TpRequest)
  t.equal(request.host, 'example.com')
  t.equal(request.protocol, 'https')
})

test('Request with trust proxy - plain', t => {
  t.plan(1)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'example.com'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.same(request.protocol, 'http')
})

test('Request with undefined socket', t => {
  t.plan(18)
  const headers = {
    host: 'hostname'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: undefined,
    headers
  }
  const request = new Request('id', 'params', req, 'query', 'log')
  t.type(request, Request)
  t.equal(request.id, 'id')
  t.equal(request.params, 'params')
  t.same(request.raw, req)
  t.equal(request.query, 'query')
  t.equal(request.headers, headers)
  t.equal(request.log, 'log')
  t.equal(request.ip, undefined)
  t.equal(request.ips, undefined)
  t.equal(request.host, 'hostname')
  t.same(request.body, null)
  t.equal(request.method, 'GET')
  t.equal(request.url, '/')
  t.equal(request.protocol, undefined)
  t.same(request.socket, req.socket)
  t.type(request.validateInput, Function)
  t.type(request.getValidationFunction, Function)
  t.type(request.compileValidationSchema, Function)
})

test('Request with trust proxy and undefined socket', t => {
  t.plan(1)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'example.com'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: undefined,
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.same(request.protocol, undefined)
})
