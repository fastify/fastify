/**
 * Schemas in Fastify follow the JSON-Schema standard. For this reason
 * we have opted to not ship strict schema based types. Instead we provide
 * an example in our documentation on how to solve this problem. Check it
 * out here:
 */
export interface FastifySchema {
  body?: unknown;
  querystring?: unknown;
  params?: unknown;
  headers?: unknown;
  response?: unknown;
}

export interface FastifyRouteSchemaDef {
  schema: FastifySchema;
  method: string;
  url: string;
  httpPart?: string;
  httpStatus?: string;
}

/**
 * Compiler for FastifySchema Type
 */
export type FastifySchemaCompiler = (routeSchema: FastifyRouteSchemaDef) => unknown
