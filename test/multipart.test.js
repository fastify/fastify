'use strict'

const test = require('tap').test
const FormData = require('form-data')
const Fastify = require('..')
const http = require('http')
const path = require('path')
const fs = require('fs')
const pump = require('pump')
const concat = require('concat-stream')

const filePath = path.join(__dirname, '..', 'README.md')

test('should parse forms', function (t) {
  t.plan(7)

  const fastify = Fastify()

  fastify.post('/', function (req, reply) {
    req.multipart(handler, function (err) {
      t.error(err)
    })

    function handler (field, file, filename, encoding, mimetype) {
      t.equal(filename, 'README.md')
      t.equal(field, 'upload')
      t.equal(encoding, '7bit')
      t.equal(mimetype, 'text/x-markdown')
      var original = fs.readFileSync(filePath, 'utf8')
      file.pipe(concat(function (buf) {
        t.equal(buf.toString(), original)
        reply.code(200).send()
      }))
    }
  })

  fastify.listen(0, function () {
    // request
    var form = new FormData()
    var opts = {
      protocol: 'http:',
      hostname: 'localhost',
      port: fastify.server.address().port,
      path: '/',
      headers: form.getHeaders(),
      method: 'POST'
    }

    var req = http.request(opts, fastify.close.bind(fastify))
    var rs = fs.createReadStream(filePath)
    form.append('upload', rs)
    pump(form, req, function (err) {
      t.error(err, 'client pump: no err')
    })
  })
})
