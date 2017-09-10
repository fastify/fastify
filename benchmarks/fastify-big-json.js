'use strict'

const fastify = require('..')()

const opts = {
  schema: {
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            employer: { type: 'string' }
          }
        }
      }
    }
  }
}

function Eng (id, title, emp) {
  this.id = id
  this.title = title
  this.employer = emp
}

fastify.get('/', opts, function (request, reply) {
  const jobs = []

  for (var i = 0; i < 200; i++) {
    jobs[i] = new Eng(i, 'Software Engineer', 'nearForm')
  }

  reply.send(jobs)
})

fastify.listen(3000)
