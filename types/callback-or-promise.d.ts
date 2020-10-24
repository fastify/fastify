// Common type for all functions that may use callback as last argument or return promise instead
// T - function to infer type from
// Args - hook Args
// DoneFn - hook callback
export type CallbackOrPromise<T, Args extends any[], DoneFn> =
// Ensure that TS use function as T
  T extends (...args: [...Args, infer U]) => any
    // Check whether last argument of given function is may be DoneFn
    ? DoneFn extends U
      // If yes we check whether return type is promise or not
      ? ReturnType<T> extends Promise<any>
        // If return type is promise we have to check is last arguments unknown
        ? U extends unknown
          // If it unknown then we return corresponding signature
          ? (...args: Args) => Promise<void>
          // If it known (for example has any type) we return never to prevent this case
          : never
        // Else we return sugnature with DoneFn as last argument
        : (...args: [...Args, DoneFn]) => void
      : ReturnType<T> extends Promise<any> ? (...args: Args) => Promise<void> : never
    // If TS pass non function to as T then we just return T to prevent errors
    : T
