import { BuildCompilerFromPool, ValidatorFactory } from '@fastify/ajv-compiler'
import { FastifyInstance, SafePromiseLike } from '../fastify'
/**
 * Schemas in Fastify follow the JSON-Schema standard. For this reason
 * we have opted to not ship strict schema based types. Instead we provide
 * an example in our documentation on how to solve this problem. Check it
 * out here: https://github.com/fastify/fastify/blob/main/docs/Reference/TypeScript.md#json-schema
 */
export interface FastifySchema {
  body?: unknown;
  querystring?: unknown;
  params?: unknown;
  headers?: unknown;
  response?: unknown;
}

export interface FastifyRouteSchemaDef<T> {
  schema: T;
  method: string;
  url: string;
  httpPart?: string;
  httpStatus?: string;
  contentType?: string;
}

export interface FastifySchemaValidationError {
  keyword: string;
  instancePath: string;
  schemaPath: string;
  params: Record<string, unknown>;
  message?: string;
}

export interface FastifyValidationResult {
  (data: any): boolean | SafePromiseLike<any> | { error?: Error | FastifySchemaValidationError[], value?: any }
  errors?: FastifySchemaValidationError[] | null;
}

/**
 * Compiler for FastifySchema Type
 */
export type FastifySchemaCompiler<T> = (routeSchema: FastifyRouteSchemaDef<T>) => FastifyValidationResult

/**
 * The options of the input validator pool: the options of the
 * `@fastify/ajv-compiler` pool builder.
 */
export type FastifyInputValidatorOptions = Parameters<BuildCompilerFromPool>[1]

/**
 * The options of the output validator pool.
 *
 * The output side validates *and* shapes the response payload with the JSON
 * Schema semantics: the `mode: 'JTD'` of the input side cannot work there
 * (the output pool shapes the payload with the JSON Schema keywords), so the
 * type does not advertise it.
 */
export type FastifyOutputValidatorOptions =
  NonNullable<Parameters<BuildCompilerFromPool>[1]> extends infer Options
    ? (Options extends { mode: 'JTD' } ? never : Options)
    : never

export interface FastifySchemaControllerOptions {
  bucket?: (parentSchemas?: unknown) => {
    add(schema: unknown): FastifyInstance;
    getSchema(schemaId: string): unknown;
    getSchemas(): Record<string, unknown>;
  };
  compilersFactory?: {
    buildInputValidator?: ValidatorFactory;
    buildOutputValidator?: BuildCompilerFromPool;
  };
  inputValidatorOptions?: FastifyInputValidatorOptions;
  outputValidatorOptions?: FastifyOutputValidatorOptions;
}

export type SchemaErrorDataVar = 'body' | 'headers' | 'params' | 'querystring'

export type SchemaErrorFormatter = (errors: FastifySchemaValidationError[], dataVar: SchemaErrorDataVar) => Error
