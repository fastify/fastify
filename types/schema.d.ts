export interface FastifySchema {
  body: any,
  querystring: any,
  params: any,
  response: any
} // todo

export type FastifySchemaCompiler = (schema: FastifySchema) => void // todo