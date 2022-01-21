import { ContextConfigDefault } from './utils'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FastifyContextConfig {
}

/**
 * Route context object. Properties defined here will be available in the route's handler
 */
export interface FastifyContext<ContextConfig = ContextConfigDefault> {
  config: FastifyContextConfig & ContextConfig;
}
