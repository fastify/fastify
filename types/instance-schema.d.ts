import {
  AddContentTypeParser,
  FastifyBodyParser,
  getDefaultJsonParser,
  hasContentTypeParser,
  removeAllContentTypeParsers,
  removeContentTypeParser
} from './content-type-parser'
import { RouteGenericInterface } from './route'
import {
  FastifySchema,
  FastifySchemaCompiler,
  FastifySchemaControllerOptions,
  FastifySerializerCompiler,
  SchemaErrorFormatter
} from './schema'
import { FastifyTypeContext, RawRequestOf } from './type-context'

/** Schema compilation, serialization, and content parsing members. */
export interface FastifyInstanceSchema<Context extends FastifyTypeContext, Instance> {
  validatorCompiler: FastifySchemaCompiler<any> | undefined
  setValidatorCompiler<Schema = FastifySchema>(
    schemaCompiler: FastifySchemaCompiler<Schema>
  ): Instance

  serializerCompiler: FastifySerializerCompiler<any> | undefined
  setSerializerCompiler<Schema = FastifySchema>(
    schemaCompiler: FastifySerializerCompiler<Schema>
  ): Instance

  setSchemaController(schemaControllerOpts: FastifySchemaControllerOptions): Instance
  setReplySerializer(
    replySerializer: (payload: unknown, statusCode: number) => string
  ): Instance
  setSchemaErrorFormatter(errorFormatter: SchemaErrorFormatter): Instance

  addContentTypeParser: AddContentTypeParser<
    Context['RawServer'],
    RawRequestOf<Context>,
    RouteGenericInterface,
    FastifySchema,
    Context['TypeProvider']
  >
  hasContentTypeParser: hasContentTypeParser
  removeContentTypeParser: removeContentTypeParser
  removeAllContentTypeParsers: removeAllContentTypeParsers
  getDefaultJsonParser: getDefaultJsonParser
  defaultTextParser: FastifyBodyParser<string>
}
