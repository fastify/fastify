'use strict'

const util = require('util')
const pem = require('pem')

const createCertificate = util.promisify(pem.createCertificate)

async function buildCertificate () {
  if (!global.context || !global.context.cert || !global.context.key) {
    const keys = await createCertificate({ days: 1, selfSigned: true })
    global.context = {
      cert: keys.certificate,
      key: keys.serviceKey
    }
  }
}

module.exports = { buildCertificate }
