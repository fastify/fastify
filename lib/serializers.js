'use strict'

function asReqValue (req) {
  return {
    id: req.id,
    method: req.method,
    url: req.url,
    remoteAddress: req.connection.remoteAddress,
    remotePort: req.connection.remotePort
  }
}

function asResValue (res) {
  return {
    statusCode: res.statusCode
  }
}

module.exports = {
  req: asReqValue,
  res: asResValue
}
