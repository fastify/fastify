import { ContextConfigDefault } from './utils'

export interface FastifyContextConfig {
  url: string;
}

/**
 * Route context object. Properties defined here will be available in the route's handler
 */
export interface FastifyContext<ContextConfig = ContextConfigDefault> {
  /**
   * @deprecated Use Request#routeConfig or Request#routeSchema instead
   */
  config: FastifyContextConfig & ContextConfig;
}
