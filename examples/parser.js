'use strict'

const fastify = require('../fastify')({ logger: true })
const jsonParser = require('fast-json-body')
const querystring = require('querystring')

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
      const parsed = querystring.parse(body)
      done(null, parsed)
    } catch (e) {
      done(e)
    }
  })
  payload.on('error', done)
})

// curl -X POST -d '{"hello":"world"}' -H'Content-type: application/vnd.custom+json' http://localhost:3000/
fastify.addContentTypeParser(/^application\/.+\+json$/, { parseAs: 'string' }, fastify.getDefaultJsonParser('error', 'ignore'))

// remove default json parser
// curl -X POST -d '{"hello":"world"}' -H'Content-type: application/json' http://localhost:3000/ is now no longer handled by fastify
fastify.removeContentTypeParser('application/json')

// This call would remove any content type parser
// fastify.removeAllContentTypeParsers()

fastify
  .post('/', function (req, reply) {
    reply.send(req.body)
  })

fastify.listen({ port: 3000 }, err => {
  if (err) throw err
})
