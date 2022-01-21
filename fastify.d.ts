
import { FastifyInstance, FastifyInstanceHttp2GenericInterface, FastifyInstanceHttp2SecureGenericInterface, FastifyInstanceHttpGenericInterface, FastifyInstanceHttpsGenericInterface } from './types/instance'
import { FastifyHttp2Options, FastifyHttp2SecureOptions, FastifyHttpsOptions, FastifyServerOptions } from './types/option'

declare function fastify<Generic extends FastifyInstanceHttp2SecureGenericInterface>(options: FastifyHttp2SecureOptions<Generic>): FastifyInstance<Generic>
declare function fastify<Generic extends FastifyInstanceHttp2GenericInterface>(options: FastifyHttp2Options<Generic>): FastifyInstance<Generic>
declare function fastify<Generic extends FastifyInstanceHttpsGenericInterface>(options: FastifyHttpsOptions<Generic>): FastifyInstance<Generic>
declare function fastify<Generic extends FastifyInstanceHttpGenericInterface>(options: FastifyServerOptions<Generic>): FastifyInstance<Generic>
export default fastify
export { fastify }
