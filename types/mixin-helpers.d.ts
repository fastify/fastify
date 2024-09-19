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
export type AllMixinValues<MixinCollection extends object> = UnionToIntersection<MixinCollection[AnyMixinName<MixinCollection>]['value']>

// Taken from type-fest
export type UnionToIntersection<Union> = (
  // `extends unknown` is always going to be the case and is used to convert the
  // `Union` into a [distributive conditional
  // type](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#distributive-conditional-types).
  Union extends unknown
    // The union type is used as the only argument to a function since the union
    // of function arguments is an intersection.
    ? (distributedUnion: Union) => void
    // This won't happen.
    : never
    // Infer the `Intersection` type since TypeScript represents the positional
    // arguments of unions of functions as an intersection of the union.
) extends ((mergedIntersection: infer Intersection) => void)
  // The `& Union` is to allow indexing by the resulting type
  ? Intersection & Union
  : never

export interface MixinAssertions<MixinCollection extends object> {
  hasMixin<T extends AnyMixinName<MixinCollection>>(name: T): this is MixinCollection[T]['value']
  assertMixin<T extends AnyMixinName<MixinCollection>>(name: T): asserts this is MixinCollection[T]['value']
  withMixins: this & AllMixinValues<MixinCollection>
}
