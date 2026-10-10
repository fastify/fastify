'use strict'

const {
  kReplyHasStatusCode
} = require('./symbols')

function setErrorStatusCode (reply, err) {
  if (!reply[kReplyHasStatusCode] || reply.statusCode === 200) {
    let statusCode = 500
    if (err?.statusCode >= 400 && err.statusCode <= 599) statusCode = err.statusCode
    else if (err?.status >= 400 && err.status <= 599) statusCode = err.status
    reply.code(statusCode)
  }
}

module.exports = { setErrorStatusCode }
