import Fastify, { fastify, errorCodes, LogController } from 'fastify'
import exercise from './exercise.cjs'

exercise(Fastify, { fastify, errorCodes, LogController }).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
