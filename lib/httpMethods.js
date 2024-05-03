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
  'MKCOL',
  'MKCALENDAR',
  'MOVE',
  'PROPFIND',
  'PROPPATCH',
  'SEARCH',
  'REPORT'
])

module.exports = {
  bodylessMethods,
  bodyMethods,
  supportedMethods: [
    ...bodylessMethods,
    ...bodyMethods
  ]
}
