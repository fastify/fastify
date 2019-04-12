import { FastifyInstance } from '../fastify'
import { FastifyError } from './error'
import { HTTPMethods, RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault, RawReplyBase, RawReplyDefault } from './utils'

type FastifyPlugin<
  Options extends { [key: string]: any },
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault,
  RawReply extends RawReplyBase = RawReplyDefault
> = (
  instance: FastifyInstance<RawServer, RawRequest, RawReply>,
  opts: Options,
  next: (err?: FastifyError) => void
) => void


