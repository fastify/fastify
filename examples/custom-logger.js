'use strict'

const winston = require('winston')
const logger = winston.createLogger({
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    trace: 4,
    debug: 5
  },
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})

const fastify = require('../fastify')({ logger })

fastify.get('/hello', (req, reply) => {
  fastify.log.info('Sending hello')

  reply.send({ greet: 'hello' })
})

fastify.setNotFoundHandler((request, reply) => {
  fastify.log.debug('Route not found: ', request.req.url)

  reply.status(404).send({ message: 'Not found' })
})

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.debug(`Request url: `, request.req.url)
  fastify.log.debug(`Payload: `, request.body)
  fastify.log.error(`Error occurred: `, error)

  reply.status(500).send({ message: 'Error occurred during request' })
})

fastify.listen(3000)
