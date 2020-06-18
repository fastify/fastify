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
  /**
   * FastifyError code, for example FST_ERR_NOT_FOUND
   */
  code: string;

  /**
   * Error status code if applicable (for example FST_ERR_NOT_FOUND will have 404 statusCode)
   */
  statusCode?: number;
  /**
   * Validation errors
   */
  validation?: ValidationResult[];
}
