import { GoifyResult } from "../goify";
/**
 * Represents a successful result containing a value of type T.
 */
type OkResult<T> = {
    value: T;
};
/**
 * Represents an error result containing an error message.
 */
type ErrResult = {
    error: string;
};
/**
 * A union type representing either a successful result (OkResult) or an error result (ErrResult).
 */
export type Result<T> = OkResult<T> | ErrResult;
/**
 * Executes an asynchronous operation safely and returns a Promise-based Result type.
 * This function wraps a given asynchronous operation, ensuring that its outcome
 * is always encapsulated within a 'Result<T>', which is either a success ('{ value: T }')
 * or a failure ('{ error: string }'). It includes automatic error catching.
 * @param operation The asynchronous function to execute.
 * @returns A Promise that resolves to a 'Result<T>'.
 */
export declare const buildResult: <T>(operation: () => Promise<T> | T) => Promise<Result<T>>;
export declare const buildSafeResult: <T>(operation: () => Promise<T> | T) => Promise<SafeResult<T>>;
/**
 * A class providing a more functional and robust way to handle operations
 * that can either succeed or fail, inspired by Rust's `Result` enum.
 * It encapsulates a `Result<T>` and provides methods for safely accessing
 * the contained value or error, transforming the result, and chaining operations.
 */
export declare class SafeResult<T> {
    /**
     * Static factory method to create a new `SafeResult` instance from a `Result` or a Promise resolving to a `Result`.
     * This method handles potential errors during the promise resolution.
     * @param asyncResult A `Result<T>` or a Promise resolving to a `Result<T>`.
     * @returns A Promise that resolves to a `SafeResult<T>`.
     */
    static readonly From: <T_1>(asyncResult: Result<T_1> | Promise<Result<T_1>>) => Promise<SafeResult<T_1>>;
    private result;
    /**
     * Constructs a new `SafeResult` instance.
     * @param result The underlying `Result<T>` object.
     */
    constructor(result: Result<T>);
    /**
     * Checks if the `SafeResult` contains a successful value.
     * @returns True if the result is Ok, false otherwise.
     */
    isOk(): boolean;
    /**
     * Checks if the `SafeResult` contains an error.
     * @returns True if the result is Err, false otherwise.
     */
    isErr(): boolean;
    /**
     * Returns `true` if the result is `Ok` and the value inside of it satisfies the predicate `func`.
     * @param func The predicate function to test the `Ok` value.
     * @returns `true` if `Ok` and the predicate returns `true`, `false` otherwise.
     */
    isOkAnd(func: (value: T) => boolean): boolean;
    /**
     * Returns `true` if the result is `Err` and the value inside of it satisfies the predicate `func`.
     * @param func The predicate function to test the `Err` value.
     * @returns `true` if `Err` and the predicate returns `true`, `false` otherwise.
     */
    isErrAnd(func: (error: string) => boolean): boolean;
    /**
     * Returns the contained `Ok` value, or throws an error if the `SafeResult` is `Err`.
     * Use with caution, as this can lead to unhandled exceptions.
     * @returns The contained `Ok` value.
     * @throws An `Error` if the result is `Err`, with the error message as its content.
     */
    unwrap(): T;
    /**
     * Returns the contained `Ok` value, or throws an error with the provided message
     * if the `SafeResult` is `Err`.
     * Use with caution, as this can lead to unhandled exceptions.
     * @param message The message to use if the result is `Err`.
     * @returns The contained `Ok` value.
     * @throws An `Error` with the specified message if the result is `Err`.
     */
    expect(message: string): T;
    /**
     * Returns the contained `Ok` value or a provided default value if the `SafeResult` is `Err`.
     * @param defaultValue The default value to return if the result is `Err`.
     * @returns The contained `Ok` value or the default value.
     */
    unwrapOr(defaultValue: T): T;
    /**
     * Returns the contained `Ok` value or computes it from a closure if the `SafeResult` is `Err`.
     * @param onErrorFunc The function to call if the result is `Err`, which computes the default value.
     * @returns The contained `Ok` value or the result of `onErrorFunc`.
     */
    unwrapOrElse(onErrorFunc: (error: string) => T): T;
    /**
     * Returns the contained `Err` value, or throws an error if the `SafeResult` is `Ok`.
     * Use with caution, as this can lead to unhandled exceptions.
     * @returns An `Error` object containing the error message.
     * @throws An `Error` if the result is `Ok`.
     */
    unwrapErr(): Error;
    /**
     * Returns the contained `Err` value, or throws an error with the provided message
     * if the `SafeResult` is `Ok`.
     * Use with caution, as this can lead to unhandled exceptions.
     * @param message The message to use if the result is `Ok`.
     * @returns An `Error` object containing the error message.
     * @throws An `Error` with the specified message if the result is `Ok`.
     */
    expectErr(message: string): Error;
    /**
     * Maps an `OkResult<T>` to `OkResult<U>` by applying a function to the contained value,
     * or returns the original `ErrResult` if the `SafeResult` is `Err`.
     * @param transform The function to apply to the `Ok` value.
     * @returns A new `SafeResult<U>` with the transformed value or the original error.
     */
    map<U>(transform: (value: T) => U): SafeResult<U>;
    /**
     * Maps an `ErrResult` to a new `ErrResult` by applying a function to the contained error,
     * or returns the original `OkResult` if the `SafeResult` is `Ok`.
     * The function's return value is converted to a string error message.
     * @param transform The function to apply to the `Err` value.
     * @returns A new `SafeResult<T>` with the transformed error or the original successful value.
     */
    mapErr<U>(transform: (error: string) => U): SafeResult<T>;
    /**
     * Returns `res` if the `SafeResult` is `Ok`, otherwise returns the `Err` value of `this`.
     * @param otherResult The other `SafeResult` to return if `this` is `Ok`.
     * @returns `otherResult` if `this` is `Ok`, otherwise `this` (containing the error).
     */
    and<U>(otherResult: SafeResult<U>): SafeResult<U>;
    /**
     * Calls `transform` if the `SafeResult` is `Ok`, otherwise returns the `Err` value of `this`.
     * This is a monadic bind operation, useful for chaining operations that might fail.
     * @param transform The function to call with the `Ok` value, which returns a new `SafeResult`.
     * @returns A new `SafeResult` from the `transform` function or the original error.
     */
    andThen<U>(transform: (value: T) => SafeResult<U>): SafeResult<U>;
    /**
     * Returns `this` if the `SafeResult` is `Ok`, otherwise returns `otherResult`.
     * @param otherResult The other `SafeResult` to return if `this` is `Err`.
     * @returns `this` if `Ok`, otherwise `otherResult`.
     */
    or(otherResult: SafeResult<T>): SafeResult<T>;
    /**
     * Returns `this` if the `SafeResult` is `Ok`, otherwise calls `onErrorFunc` and returns the result.
     * @param onErrorFunc The function to call with the `Err` value, which returns a new `SafeResult`.
     * @returns `this` if `Ok`, otherwise the result of `onErrorFunc`.
     */
    orElse(onErrorFunc: (error: string) => SafeResult<T>): SafeResult<T>;
    /**
     * Returns the contained `Ok` value if the result is `Ok`, otherwise returns `undefined`.
     * @returns The `Ok` value or `undefined`.
     */
    ok(): T | undefined;
    /**
     * Returns the contained `Err` value if the result is `Err`, otherwise returns `undefined`.
     * @returns The `Err` message or `undefined`.
     */
    err(): string | undefined;
    /**
     * Converts the `SafeResult` back to its underlying `Result` type.
     * @returns The `Result<T>` object.
     */
    toResult(): Result<T>;
}
/**
 * A class providing a functional way to handle optional values,
 * representing either the presence (Some) or absence (None) of a value.
 * Inspired by Rust's `Option` enum, it helps avoid common `null` or `undefined` issues.
 */
declare class Option<T> {
    /**
     * Static factory method to create a new `Option` instance from a value or a Promise resolving to a value.
     * It handles potential rejections during promise resolution by returning a `None` Option.
     * @param value An optional value or a Promise resolving to an optional value.
     * @returns A Promise that resolves to an `Option<T>`.
     */
    static readonly From: <T_1>(value?: T_1 | Promise<T_1 | undefined> | undefined) => Promise<Option<T_1>>;
    private value?;
    /**
     * Constructs a new `Option` instance.
     * @param value The initial value to encapsulate. If undefined, it represents a `None` state.
     */
    constructor(value?: T);
    /**
     * Returns `true` if the `Option` contains a value (`Some`).
     * @returns `true` if the option is `Some`, `false` otherwise.
     */
    isSome(): boolean;
    /**
     * Returns `true` if the `Option` does not contain a value (`None`).
     * @returns `true` if the option is `None`, `false` otherwise.
     */
    isNone(): boolean;
    /**
      * Returns `true` if the `Option` is `Some` and the value inside of it satisfies the predicate `func`.
      * @param func The predicate function to test the `Some` value.
      * @returns `true` if the option is `Some` and the predicate returns `true`, `false` otherwise.
      */
    isSomeAnd(func: (value: T) => boolean): boolean;
    /**
    * Returns `true` if the `Option` is `None` and the predicate `func` returns `true`.
    * @param func The predicate function to test the `None` state.
    * @returns `true` if the option is `None` and the predicate returns `true`, `false` otherwise.
    */
    isNoneAnd(func: () => boolean): boolean;
    /**
     * Returns the contained `Some` value, or throws an error if the `Option` is `None`.
     * Use with caution, as this can lead to unhandled exceptions.
     * @returns The contained `Some` value.
     * @throws An `Error` if the option is `None`.
     */
    unwrap(): T;
    /**
     * Returns the contained `Some` value, or throws an error with the provided message
     * if the `Option` is `None`.
     * Use with caution, as this can lead to unhandled exceptions.
     * @param message The message to use if the option is `None`.
     * @returns The contained `Some` value.
     * @throws An `Error` with the specified message if the option is `None`.
     */
    expect(message: string): T;
    /**
     * Returns the contained `Some` value or a provided default value if the `Option` is `None`.
     * @param defaultValue The default value to return if the option is `None`.
     * @returns The contained `Some` value or the default value.
     */
    unwrapOr(_default: T): T;
    /**
     * Returns the contained `Some` value or computes it from a closure if the `Option` is `None`.
     * @param onNoneFunc The function to call if the option is `None`, which computes the default value.
     * @returns The contained `Some` value or the result of `onNoneFunc`.
     */
    unwrapOrElse(func: () => T): T;
    /**
     * Maps a `Some` value to a new `Some` value by applying a function to the contained value,
     * or returns `None` if the `Option` is `None`.
     * @param transform The function to apply to the `Some` value.
     * @returns A new `Option<U>` with the transformed value or `None`.
     */
    map<U>(func: (value: T) => U): Option<U>;
    /**
     * Calls `transform` if the `Option` is `Some`, otherwise returns `None`.
     * This is a monadic bind operation, useful for chaining operations that might return an `Option`.
     * @param transform The function to call with the `Some` value, which returns a new `Option`.
     * @returns A new `Option` from the `transform` function or `None`.
     */
    andThen<U>(func: (value: T) => Option<U>): Option<U>;
    /**
     * Returns `other` if the `Option` is `Some`, otherwise returns `None`.
     * @param other The other `Option` to return if `this` is `Some`.
     * @returns `other` if `this` is `Some`, otherwise `None`.
     */
    and<U>(other: Option<U>): Option<U>;
    /**
     * Returns `this` if the `Option` is `Some`, otherwise returns `other`.
     * @param other The other `Option` to return if `this` is `None`.
     * @returns `this` if `Some`, otherwise `other`.
     */
    or(other: Option<T>): Option<T>;
    /**
     * Returns `Some` if exactly one of `this` or `other` is `Some`, otherwise returns `None`.
     * This is an exclusive OR operation for `Option` types.
     * @param other The other `Option` to compare with.
     * @returns An `Option` containing the value from the `Some` option if only one is `Some`, otherwise `None`.
     */
    xor(other: Option<T>): Option<T>;
    /**
     * Takes the value out of the `Option`, leaving `None` in its place.
     * This effectively consumes the value, making the current `Option` `None`.
     * @returns A new `Option` containing the value that was previously in `this`, or `None`.
     */
    take(): Option<T>;
    /**
     * Converts the `Option` into a `SafeResult<T>`.
     * If the `Option` is `Some`, it returns `OkResult<T>`.
     * If the `Option` is `None`, it returns `ErrResult` with the provided error.
     * @param err The `Error` object to use if the option is `None`.
     * @returns A `SafeResult<T>` representing either the `Some` value or the provided error.
     */
    okOr(err: Error): SafeResult<T>;
    /**
     * Converts the `Option` into a `SafeResult<T>`.
     * If the `Option` is `Some`, it returns `OkResult<T>`.
     * If the `Option` is `None`, it returns `ErrResult` with an error computed by the provided closure.
     * @param onErrorFunc The function to call if the option is `None`, which computes the `Error`.
     * @returns A `SafeResult<T>` representing either the `Some` value or the computed error.
     */
    okOrElse(func: () => Error): SafeResult<T>;
}
/**
 * Creates a new `Option` instance that contains a value (`Some`).
 * This is a convenience function for encapsulating a present value within an `Option`.
 * It's particularly useful when you explicitly want to indicate the presence of a non-null or non-undefined value.
 * @param value The value to be wrapped within the `Option`.
 * @returns An `Option<T>` instance representing the "Some" state with the provided value.
 */
export declare const Some: <T>(value?: T) => Option<T>;
/**
 * Creates a new `Option` instance that represents the absence of a value (`None`).
 * This function serves as a straightforward way to create an `Option` indicating that no value is present.
 * It's often used to explicitly handle cases where a value might be missing,
 * avoiding the need for `null` or `undefined` checks.
 * @returns An `Option<T>` instance representing the "None" state.
 */
export declare const None: <T>() => Option<T>;
/**
 * Performs pattern matching on `Option` or `SafeResult` types.
 * It executes the appropriate callback function based on whether the input is `Some`/`Ok` or `None`/`Err`.
 * This function effectively converts an `Option` or `SafeResult` into a `GoifyResult`,
 * which is a common pattern for handling errors in a Go-like style (value, error).
 *
 * If the input is an `Option<T>`:
 * - If it's `Some(value)`, the `value` is returned as the successful result.
 * - If it's `None`, an `Error` indicating "None" is returned as the error result.
 *
 * If the input is a `SafeResult<T>`:
 * - If it's `Ok(value)`, the `value` is returned as the successful result.
 * - If it's `Err(error)`, the underlying `error` is returned as the error result.
 *
 * @param input The `Option` or `SafeResult` instance to match against.
 * @returns A `GoifyResult<T, Error>` containing either the successful value or an `Error`.
 */
export declare const match: <T>(input: Option<T> | SafeResult<T>) => GoifyResult<T, Error>;
export declare const matchAsync: <T>(input: Promise<Option<T> | SafeResult<T>>) => Promise<GoifyResult<T, Error>>;
export type SafeOption<T> = InstanceType<typeof Option<T>>;
export {};
