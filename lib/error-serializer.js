'use strict'

/**
 * Serializes the body of the built-in error responses.
 *
 * Only the four properties of an error response are kept, in this order: the
 * `message` of an `Error` instance is not enumerable, so it is read explicitly.
 *
 * @param {object} error the error, or the error response body
 * @returns {string} the serialized error response body
 */
module.exports = function serializeError ({ statusCode, code, error, message }) {
  return JSON.stringify({ statusCode, code, error, message })
}
