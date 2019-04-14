import { RouteShorthandOptions } from './route'
import { HTTPMethods, RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault, RawReplyBase, RawReplyDefault } from './utils'
import { FastifyPlugin } from './plugin';
import { FastifyInstance } from './instance';

export interface FastifyRegister<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> {
  <Options = { [key: string]: any }>(plugin: FastifyPlugin<Options, RawServer>, opts?: RegisterOptions & Options): void;
}

export type RegisterOptions = {
  prefix?: string,
  logLevel?: string
}