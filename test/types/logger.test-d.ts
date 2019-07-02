import {expectType, expectError} from 'tsd'
import fastify, { FastifyLoggerOptions, FastifyLogFn, LogLevels } from '../../fastify'

expectType<FastifyLoggerOptions>(fastify().log)

;['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(logLevel => {
  expectType<FastifyLogFn>(fastify().log[logLevel as LogLevels])
  expectType<void>(fastify().log[logLevel as LogLevels](''))
  expectType<void>(fastify().log[logLevel as LogLevels]({}))
  expectError(fastify().log[logLevel as LogLevels](0))
})

// expectError(fastify().log.info())

// expectError(fastify().log.error())

// expectError(fastify().log.debug())

// expectError(fastify().log.fatal())

// expectError(fastify().log.warn())

// expectError(fastify().log.trace())


// Custom Log Function does not work yet
// function logFn(msg: string) {
//   expectType<string>(msg)
// }

// const logFastify = fastify({
//   logger: {
//     info: logFn,
//     error: logFn,
//     debug: logFn,
//     fatal: logFn,
//     warn: logFn,
//     trace: logFn
//   }
// })

// expectType<FastifyLogFn>(logFastify.log.info)
// expectType<void>(logFastify.log.info(''))
// // expectType<void>(logFastify.log.info({})) // broken test. Need to fix logger type to infer custom logger from user
// expectError(logFastify.log.info(0))

// expectType<FastifyLogFn>(logFastify.log.error)
// expectType<void>(logFastify.log.error(''))
// // expectType<void>(logFastify.log.error({})) // l105
// expectError(logFastify.log.error(0))

// expectType<FastifyLogFn>(logFastify.log.debug)
// expectType<void>(logFastify.log.debug(''))
// // expectType<void>(logFastify.log.debug({})) // l105
// expectError(logFastify.log.debug(0))

// expectType<FastifyLogFn>(logFastify.log.fatal)
// expectType<void>(logFastify.log.fatal(''))
// // expectType<void>(logFastify.log.fatal({})) // l105
// expectError(logFastify.log.fatal(0))

// expectType<FastifyLogFn>(logFastify.log.warn)
// expectType<void>(logFastify.log.warn(''))
// // expectType<void>(logFastify.log.warn({})) // l105
// expectError(logFastify.log.warn(0))

// expectType<FastifyLogFn>(logFastify.log.trace)
// expectType<void>(logFastify.log.trace(''))
// // expectType<void>(logFastify.log.trace({})) // l105
// expectError(logFastify.log.trace(0))
