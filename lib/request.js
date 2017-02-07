'use strict'

function Request (params, req, body, query) {
  this.params = params
  this.req = req
  this.body = body
  this.query = query
}

module.exports = Request
