'use strict'

const {
  kReplyHasStatusCode
} = require('./symbols')

function isValidErrorStatusCode (statusCode) {
  return statusCode >= 400 && statusCode <= 599
}

function setErrorStatusCode (reply, err) {
  if (!reply[kReplyHasStatusCode] || reply.statusCode === 200) {
    const statusCode = err && (err.statusCode || err.status)
    reply.code(isValidErrorStatusCode(statusCode) ? statusCode : 500)
  }
}

module.exports = { setErrorStatusCode, isValidErrorStatusCode }
