export interface ValidationResult {
  keyword: string;
  dataPath: string;
  schemaPath: string;
  params: {
    [type: string]: string;
  },
  message: string;
}

/**
 * Fastify custom error
 */
export interface FastifyError extends Error {
  statusCode?: number;
  /**
   * Validation errors
   */
  validation?: Array<ValidationResult>;
}