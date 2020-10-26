// Common type for all functions that may use callback as last argument or return promise instead
// HookFn - function to infer type from
// Args - hook Args
// DoneFn - hook callback
export type CallbackOrPromise<Fn extends (...args: any) => any, Args extends any[], DoneFn extends [any]> =
// Get given hook arguments type and return type
  Fn extends (...args: infer Arguments) => infer RT
    // Check return type
    ? RT extends PromiseLike<infer P>
      // Return async hook signature
      ? (...args: Args) => Promise<P>
      // Check that sync hook has expected amount of arguments
      : Arguments extends [...Args, unknown]
        // If so return corresponding signature
        ? (...args: [...Args, ...DoneFn]) => void
        // Otherwise never
        : never
    // TODO: investigate why we need to return Fn here instead of never
    : Fn
