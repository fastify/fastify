/**
 * The route validation internally relies upon Ajv, which is a high-performance JSON schema validator.
 */
export interface ValidationResult {
  keyword: string;
  dataPath: string;
  schemaPath: string;
  params: {
    [type: string]: string;
  };
  message: string;
}

/**
 * FastifyError is a custom error object that includes status code and validation results.
 */
export interface FastifyError extends Error {
  statusCode?: number;
  /**
   * Validation errors
   */
  validation?: ValidationResult[];
}
