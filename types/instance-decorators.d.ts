type AnyFunction = (...args: never[]) => unknown

type GetterSetter<This, Value> = Value | {
  getter: (this: This) => Value,
  setter?: (this: This, value: Value) => void
}

type DecorationMethod<This, Instance, Return = Instance> = {
  <
    // Keep the historical generic order: decorate<Foo>() must retain its meaning.
    Value extends (Property extends keyof This ? This[Property] : unknown),
    Property extends string | symbol = string | symbol
  >(
    property: Property,
    value: GetterSetter<This, Value extends AnyFunction
      ? (this: This, ...args: Parameters<Value>) => ReturnType<Value>
      : Value
    >,
    dependencies?: string[]
  ): Return

  (property: string | symbol): Return
  (property: string | symbol, value: null | undefined, dependencies: string[]): Return
}

/** Members for decorating and inspecting a Fastify instance. */
export interface FastifyInstanceDecorators<Instance, Request, Reply> {
  decorate: DecorationMethod<Instance, Instance>
  decorateRequest: DecorationMethod<Request, Instance>
  decorateReply: DecorationMethod<Reply, Instance>

  getDecorator<Value>(name: string | symbol): Value

  hasDecorator(decorator: string | symbol): boolean
  hasRequestDecorator(decorator: string | symbol): boolean
  hasReplyDecorator(decorator: string | symbol): boolean
  hasPlugin(name: string): boolean
}
