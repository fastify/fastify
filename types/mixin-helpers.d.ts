interface UnknownMixin {
  name: string
  value: unknown;
}

type ValidMixinCollection<MixinCollection extends object> = {
  [key in keyof MixinCollection as (
    MixinCollection[key] extends UnknownMixin
      ? key extends MixinCollection[key]['name'] ? key : never
      : never
  )]: string extends key ? never : MixinCollection[key]
}

export interface Mixin<Name extends AnyMixinName<MixinCollection>, V extends object, MixinCollection extends object> extends UnknownMixin {
  // Validates that its a string literal
  name: string extends Name ? never : (Name extends string ? Name : never);
  value: V;
}

export type AnyMixin<MixinCollection extends object> = ValidMixinCollection<MixinCollection> extends infer Collection
  ? Collection[keyof Collection] extends UnknownMixin
    ? Collection[keyof Collection]
    : never
  : never

export type AnyMixinName<MixinCollection extends object> = AnyMixin<MixinCollection>['name']
export type AnyMixinValue<MixinCollection extends object> = AnyMixin<MixinCollection>['value']

export interface MixinAssertions<MixinCollection extends object> {
  hasMixin<T extends AnyMixinName<MixinCollection>>(name: T): this is MixinCollection[T]['value']
  assertMixin<T extends AnyMixinName<MixinCollection>>(name: T): asserts this is MixinCollection[T]['value']
}
