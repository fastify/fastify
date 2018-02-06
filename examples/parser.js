'use strict'

const fastify = require('../fastify')()
const jsonParser = require('fast-json-body')
const qs = require('qs')

// Handled by fastify
// curl -X POST -d '{"hello":"world"}' -H'Content-type: application/json' http://localhost:3000/

// curl -X POST -d '{"hello":"world"}' -H'Content-type: application/jsoff' http://localhost:3000/
fastify.addContentTypeParser('application/jsoff', function (req, done) {
  jsonParser(req, function (err, body) {
    done(err, body)
  })
})

// curl -X POST -d 'hello=world' -H'Content-type: application/x-www-form-urlencoded' http://localhost:3000/
fastify.addContentTypeParser('application/x-www-form-urlencoded', function (req, done) {
  var body = ''
  req.on('data', function (data) {
    body += data
  })
  req.on('end', function () {
    try {
      const parsed = qs.parse(body)
      done(null, parsed)
    } catch (e) {
      done(e)
    }
  })
  req.on('error', done)
})

fastify
  .post('/', function (req, reply) {
    reply.send(req.body)
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
