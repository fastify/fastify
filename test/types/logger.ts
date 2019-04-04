import * as fastify from '../../fastify'
import * as pino from 'pino'

fastify({ logger: true })

fastify({
  logger: {
    serializers: {
      req: (req) => {
        return {
          method: req.method,
          url: req.url,
          version: req.headers['accept-version'],
          hostname: req.hostname,
          remoteAddress: req.ip,
          remotePort: req.connection.remotePort
        }
      },
      err: pino.stdSerializers.err,
      res: (res) => {
        return {
          statusCode: res.statusCode
        }
      }
    },
    info: (o) => {},
    error: (o) => {},
    debug: (o) => {},
    fatal: (o) => {},
    warn: (o) => {},
    trace: (o) => {},
    child: (o) => {},
    genReqId: 'abc123'
  }
})

fastify({
  logger: {
    name: 'logger',
    timestamp: false,
    prettyPrint: true
  }
})