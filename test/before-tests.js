'use strict'

const util = require('util')
const fs = require('fs')
const path = require('path')
const pem = require('pem')

const createCertificate = util.promisify(pem.createCertificate)

(async () => {
  try {
    const keys = await createCertificate({ days: 1, selfSigned: true })
    const certFile = path.join(__dirname, 'https', 'fastify.cert')
    const keyFile = path.join(__dirname, 'https', 'fastify.key')
    if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
      await Promise.all([
        fs.promises.writeFile(certFile, keys.certificate),
        fs.promises.writeFile(keyFile, keys.serviceKey)
      ])
    }
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
})()
