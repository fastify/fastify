'use strict'

const { test } = require('tap')

const Request = require('../../lib/request')

test('Regular request', t => {
  t.plan(14)
  const headers = {
    host: 'hostname'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const request = new Request('id', 'params', req, 'query', 'log')
  t.type(request, Request)
  t.strictEqual(request.id, 'id')
  t.strictEqual(request.params, 'params')
  t.deepEqual(request.raw, req)
  t.strictEqual(request.query, 'query')
  t.strictEqual(request.headers, headers)
  t.strictEqual(request.log, 'log')
  t.strictEqual(request.ip, 'ip')
  t.strictEqual(request.ips, undefined)
  t.strictEqual(request.hostname, 'hostname')
  t.strictEqual(request.body, null)
  t.strictEqual(request.method, 'GET')
  t.strictEqual(request.url, '/')
  t.deepEqual(request.socket, req.socket)
})

test('Regular request - hostname from authority', t => {
  t.plan(2)
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
  t.strictEqual(request.hostname, 'authority')
})

test('Regular request - host header has precedence over authority', t => {
  t.plan(2)
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
  t.strictEqual(request.hostname, 'hostname')
})

test('Request with trust proxy', t => {
  t.plan(14)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'example.com'
  }
  const req = {
    method: 'GET',
    url: '/',
    // Some dependencies (proxy-addr, forwarded) still depend on the deprecated
    // .connection property, we use .socket. Include both to satisfy everyone.
    socket: { remoteAddress: 'ip' },
    connection: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.type(request, TpRequest)
  t.strictEqual(request.id, 'id')
  t.strictEqual(request.params, 'params')
  t.deepEqual(request.raw, req)
  t.strictEqual(request.query, 'query')
  t.strictEqual(request.headers, headers)
  t.strictEqual(request.log, 'log')
  t.strictEqual(request.ip, '2.2.2.2')
  t.deepEqual(request.ips, ['ip', '1.1.1.1', '2.2.2.2'])
  t.strictEqual(request.hostname, 'example.com')
  t.strictEqual(request.body, null)
  t.strictEqual(request.method, 'GET')
  t.strictEqual(request.url, '/')
  t.deepEqual(request.socket, req.socket)
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
    connection: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.type(request, TpRequest)
  t.strictEqual(request.hostname, 'hostname')
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
    connection: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.type(request, TpRequest)
  t.strictEqual(request.hostname, 'authority')
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
    connection: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.type(request, TpRequest)
  t.strictEqual(request.hostname, 'example.com')
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
    // Some dependencies (proxy-addr, forwarded) still depend on the deprecated
    // .connection property, we use .socket. Include both to satisfy everyone.
    socket: { remoteAddress: 'ip' },
    connection: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.type(request, TpRequest)
  t.strictEqual(request.hostname, 'example.com')
  t.strictEqual(request.protocol, 'https')
})
