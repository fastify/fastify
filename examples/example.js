'use strict'

const fastify = require('../fastify')()

const opts = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      }
    }
  }
}

fastify
  .get('/', opts, (req, reply) => {
    reply.header('Content-Type', 'application/json').code(200)
    reply.send({ hello: 'world' })
  })
  .get('/promise', opts, (req, reply) => {
    const promise = new Promise((resolve, reject) => {
      resolve({ hello: 'world' })
    })
    reply.header('content-type', 'application/json').code(200).send(promise)
  })
  .get('/return-promise', opts, (req, reply) => {
    const promise = new Promise((resolve, reject) => {
      resolve({ hello: 'world' })
    })
    return promise
  })
  .get('/stream', (req, reply) => {
    const fs = require('fs')
    const stream = fs.createReadStream(process.cwd() + '/examples/plugin.js', 'utf8')
    reply.code(200).send(stream)
  })
  .post('/', opts, (req, reply) => {
    reply.send({ hello: 'world' })
  })
  .head('/', {}, (req, reply) => {
    reply.send()
  })
  .delete('/', opts, (req, reply) => {
    reply.send({ hello: 'world' })
  })
  .patch('/', opts, (req, reply) => {
    reply.send({ hello: 'world' })
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
