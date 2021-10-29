export interface FastifyTypeProvider {
  readonly input: unknown,
  readonly output: unknown,
}

export interface FastifyTypeProviderDefault extends FastifyTypeProvider {
  output: unknown
}

export type CallTypeProvider<F extends FastifyTypeProvider, I> = (F & { input: I })['output']
