/**
 * Schemas in Fastify follow the JSON-Schema standard. For this reason
 * we have opted to not ship strict schema based types. Instead we provide
 * an example in our documentation on how to solve this problem. Check it
 * out here: https://github.com/fastify/fastify/blob/main/docs/TypeScript.md#json-schema
 */
export interface FastifySchema {
  body?: unknown;
  querystring?: unknown;
  params?: unknown;
  headers?: unknown;
  response?: unknown;
}

export interface FastifyRouteSchemaDef<Schema> {
  schema: Schema;
  method: string;
  url: string;
  httpPart?: string;
  httpStatus?: string;
}

export interface FastifySchemaValidationError {
  message?: string;
  instancePath: string;
}

export interface FastifyValidationResult {
  (data: any): boolean | PromiseLike<any> | { error?: Error, value?: any }
  errors?: FastifySchemaValidationError[] | null;
}

/**
 * Compiler for FastifySchema Type
 */
export type FastifyValidatorCompiler<Schema> = (routeSchema: FastifyRouteSchemaDef<Schema>) => FastifyValidationResult

export type FastifySerializerCompiler<Schema> = (routeSchema: FastifyRouteSchemaDef<Schema>) => (data: any) => string
