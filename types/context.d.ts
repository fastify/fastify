import { ContextConfigDefault } from './utils'
import { FastifyRouteConfig } from './route'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FastifyContextConfig extends FastifyRouteConfig {
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
