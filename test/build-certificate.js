'use strict'

const util = require('util')
const pem = require('pem')

const createCertificate = util.promisify(pem.createCertificate)

async function buildCertificate () {
  if (!globalThis.context || !globalThis.context.cert || !globalThis.context.key) {
    const keys = await createCertificate({ days: 1, selfSigned: true })
    globalThis.context = {
      cert: keys.certificate,
      key: keys.serviceKey
    }
  }
}

module.exports = { buildCertificate }
