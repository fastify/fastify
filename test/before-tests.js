'use strict'

const fs = require('fs').promises
const path = require('path')
const pem = require('pem')

// Certificate properties
const certProps = {
  days: 1, // Validity in days
  selfSigned: true
}

pem.createCertificate(certProps, async (error, keys) => {
  if (error) throw error
  await fs.writeFile(path.join(__dirname, 'https', 'fastify.cert'), keys.certificate)
  await fs.writeFile(path.join(__dirname, 'https', 'fastify.key'), keys.serviceKey)
})
