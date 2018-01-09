'use strict'

const fastify = require('../fastify')()

fastify.addSchema({
  $id: 'error',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'string' }
  }
})

fastify.addSchema({
  $id: 'todo-item',
  type: 'object',
  properties: {
    name: { type: 'string' },
    id: { type: 'string' }
  }
})

const getInstanceOpts = {
  schema: {
    response: {
      200: 'todo-item#',
      '4xx': 'error#'
    }
  }
}

const postInstanceOpts = {
  schema: {
    body: 'todo-item#',
    response: {
      200: 'todo-item#',
      '4xx': 'error#',
      '5xx': 'error#'
    }
  }
}

const listInstanceOpts = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          list: {
            type: 'array',
            items: {
              $ref: 'todo-item#'
            }
          }
        }
      }
    }
  }
}

const cache = {
  '1234': 'Do the dishes',
  '4567': 'Clean the pantry',
  '8901': 'Do laundry'
}

fastify
  .get('/', listInstanceOpts, async function (req, reply) {
    const list = Object.keys(cache).map(id => ({
      id,
      name: cache[id]
    }))
    return { list }
  })
  .get('/:id', getInstanceOpts, async function (req, reply) {
    if (cache[req.params.id]) {
      return {
        id: req.params.id,
        name: cache[req.params.id]
      }
    } else {
      reply.code(404).send({
        message: 'Instance not found',
        code: 'CACHE-MISSING-KEY'
      })
    }
  })
  .post('/', postInstanceOpts, async function (req, reply) {
    if (cache[req.body.id]) {
      reply.code(400).send({
        message: 'Instance already exists',
        code: 'CACHE-HAS-KEY'
      })
    } else if (req.body.id[0] === '1') {
      reply.code(500).send({
        message: 'Something went wrong',
        code: 'STARTED-WITH-1'
      })
    } else {
      cache[req.body.id] = req.body.name
      return req.body
    }
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
