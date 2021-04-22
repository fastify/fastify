'use strict'

const util = require('util')
const pem = require('pem')

const createCertificate = util.promisify(pem.createCertificate)

async function buildCertificate () {
  // "global" is used in here because "t.context" is only supported by "t.beforeEach" and "t.afterEach"
  // For the test case which execute this code which will be using `t.before` and it can reduce the
  // number of times executing it.
  if (!global.context || !global.context.cert || !global.context.key) {
    const keys = await createCertificate({ days: 1, selfSigned: true })
    global.context = {
      cert: keys.certificate,
      key: keys.serviceKey
    }
  }
}

module.exports = { buildCertificate }
