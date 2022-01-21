import * as http from 'http';
import { FastifyLoggerInstance } from "./logger";

export interface FastifyInstanceGenericInterface {
  Server?: unknown
  Request?: unknown
  Reply?: unknown
  Logger?: unknown
  TypeProvider?: unknown
}

export type GetServer<Generic extends FastifyInstanceGenericInterface> = Generic["Server"] extends unknown | undefined ? http.Server : Generic['Server']

// if logger is not set, we fallback to the default logger
export type GetLogger<Generic extends FastifyInstanceGenericInterface> = Generic["Logger"] extends unknown | undefined ? FastifyLoggerInstance : Generic["Logger"]