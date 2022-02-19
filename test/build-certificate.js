'use strict'

const selfCert = require('self-cert')

async function buildCertificate () {
  // "global" is used in here because "t.context" is only supported by "t.beforeEach" and "t.afterEach"
  // For the test case which execute this code which will be using `t.before` and it can reduce the
  // number of times executing it.
  if (!global.context || !global.context.cert || !global.context.key) {
    const certs = selfCert({
      expires: new Date(Date.now() + 86400000)
    })
    global.context = {
      cert: certs.certificate,
      key: certs.privateKey
    }
  }
}

module.exports = { buildCertificate }
