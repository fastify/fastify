'use strict'

const fastify = require('../fastify')()
const jsonParser = require('fast-json-body')
const qs = require('qs')

// Handled by fastify
// curl -X POST -d '{"hello":"world"}' -H'Content-type: application/json' http://localhost:3000/

// curl -X POST -d '{"hello":"world"}' -H'Content-type: application/jsoff' http://localhost:3000/
fastify.addContentTypeParser('application/jsoff', function (request, payload, done) {
  jsonParser(payload, function (err, body) {
    done(err, body)
  })
})

// curl -X POST -d 'hello=world' -H'Content-type: application/x-www-form-urlencoded' http://localhost:3000/
fastify.addContentTypeParser('application/x-www-form-urlencoded', function (request, payload, done) {
  let body = ''
  payload.on('data', function (data) {
    body += data
  })
  payload.on('end', function () {
    try {
      const parsed = qs.parse(body)
      done(null, parsed)
    } catch (e) {
      done(e)
    }
  })
  payload.on('error', done)
})

fastify
  .post('/', function (req, reply) {
    reply.send(req.body)
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
