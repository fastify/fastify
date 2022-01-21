// -----------------------------------------------------------------------------------------------
// TypeProvider
// -----------------------------------------------------------------------------------------------

export interface FastifyTypeProvider {
  readonly input: unknown,
  readonly output: unknown,
}

export interface FastifyTypeProviderDefault extends FastifyTypeProvider {
  output: unknown
}