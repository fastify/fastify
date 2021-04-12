'use strict'

const util = require('util')
const fs = require('fs')
const path = require('path')
const pem = require('pem');

(async () => {
  const createCertificate = util.promisify(pem.createCertificate)
  const keys = await createCertificate({ days: 1, selfSigned: true })
  if (!fs.existsSync(path.join(__dirname, 'https', 'fastify.cert'))) fs.writeFileSync(path.join(__dirname, 'https', 'fastify.cert'), keys.certificate)
  if (!fs.existsSync(path.join(__dirname, 'https', 'fastify.key'))) fs.writeFileSync(path.join(__dirname, 'https', 'fastify.key'), keys.serviceKey)
})()
