'use strict'

const bodylessMethods = new Set([
  // Standard
  'GET',
  'HEAD',
  'TRACE',

  // WebDAV
  'UNLOCK'
])

const bodyMethods = new Set([
  // Standard
  'DELETE',
  'OPTIONS',
  'PATCH',
  'PUT',
  'POST',

  // WebDAV
  'COPY',
  'LOCK',
  'MOVE',
  'MKCALENDAR',
  'MKCOL',
  'PROPFIND',
  'PROPPATCH',
  'REPORT',
  'SEARCH'
])

module.exports = {
  bodylessMethods,
  bodyMethods,
  supportedMethods: [
    ...bodylessMethods,
    ...bodyMethods
  ]
}
