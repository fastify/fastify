/** A callable type used only to inspect parameters and return values. */
export type AnyFunction = (...args: never[]) => unknown

/** An asynchronous callable type used only to classify function signatures. */
export type AsyncFunction = (...args: never[]) => Promise<unknown>
