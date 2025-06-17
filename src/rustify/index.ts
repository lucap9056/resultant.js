import { goifySync, GoifyResult, goify } from "../goify";

/**
 * Represents a successful result containing a value of type T.
 */
type OkResult<T> = { value: T };

/**
 * Represents an error result containing an error message.
 */
type ErrResult = { error: string };

/**
 * A union type representing either a successful result (OkResult) or an error result (ErrResult).
 */
export type Result<T> = OkResult<T> | ErrResult;

/**
 * Converts an unknown error type into a string representation.
 * Handles strings, Error objects, objects with a 'message' property,
 * and attempts JSON stringification or falls back to String conversion.
 * @param err The unknown error to convert.
 * @returns A string representation of the error.
 */
const convertErrorToString = (err: unknown): string => {
    if (typeof err === 'string') {
        return err;
    }
    if (err instanceof Error) {
        return err.message;
    }
    if (
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as any).message === 'string'
    ) {
        return (err as any).message;
    }
    try {
        return JSON.stringify(err);
    } catch (e) {
        return String(err);
    }
};

/**
 * Executes an asynchronous operation safely and returns a Promise-based Result type.
 * This function wraps a given asynchronous operation, ensuring that its outcome
 * is always encapsulated within a 'Result<T>', which is either a success ('{ value: T }')
 * or a failure ('{ error: string }'). It includes automatic error catching.
 * @param operation The asynchronous function to execute.
 * @returns A Promise that resolves to a 'Result<T>'.
 */
export const buildResult = async <T>(
    operation: () => Promise<T> | T
): Promise<Result<T>> => {
    return new Promise(async (resolve) => {
        try {
            const value = await operation();
            resolve({ value });
        } catch (err) {
            const error = convertErrorToString(err);
            resolve({ error });
        }
    });
};

export const buildSafeResult = async<T>(
    operation: () => Promise<T> | T
): Promise<SafeResult<T>> => {
    return new Promise(async (resolve) => {
        try {
            const value = await operation();
            resolve(new SafeResult({ value }));
        } catch (err) {
            const error = convertErrorToString(err);
            resolve(new SafeResult({ error }));
        }
    });
};

const isOk = <T>(result: Result<T>): result is OkResult<T> =>
    'value' in result;

const isErr = <T>(result: Result<T>): result is ErrResult =>
    'error' in result;

/**
 * A class providing a more functional and robust way to handle operations
 * that can either succeed or fail, inspired by Rust's `Result` enum.
 * It encapsulates a `Result<T>` and provides methods for safely accessing
 * the contained value or error, transforming the result, and chaining operations.
 */
export class SafeResult<T> {
    /**
     * Static factory method to create a new `SafeResult` instance from a `Result` or a Promise resolving to a `Result`.
     * This method handles potential errors during the promise resolution.
     * @param asyncResult A `Result<T>` or a Promise resolving to a `Result<T>`.
     * @returns A Promise that resolves to a `SafeResult<T>`.
     */
    public static readonly From = async <T>(
        asyncResult: Result<T> | Promise<Result<T>>
    ): Promise<SafeResult<T>> => {
        try {
            const result = await asyncResult;
            return new SafeResult(result);
        } catch (err) {
            const error = convertErrorToString(err);
            return new SafeResult({ error });
        }
    };

    private result: Result<T>;

    /**
     * Constructs a new `SafeResult` instance.
     * @param result The underlying `Result<T>` object.
     */
    constructor(result: Result<T>) {
        this.result = result;
    }

    /**
     * Checks if the `SafeResult` contains a successful value.
     * @returns True if the result is Ok, false otherwise.
     */
    public isOk(): boolean {
        return isOk(this.result);
    }

    /**
     * Checks if the `SafeResult` contains an error.
     * @returns True if the result is Err, false otherwise.
     */
    public isErr(): boolean {
        return isErr(this.result);
    }

    /**
     * Returns `true` if the result is `Ok` and the value inside of it satisfies the predicate `func`.
     * @param func The predicate function to test the `Ok` value.
     * @returns `true` if `Ok` and the predicate returns `true`, `false` otherwise.
     */
    public isOkAnd(func: (value: T) => boolean): boolean {
        if (isOk(this.result)) {
            return func(this.result.value);
        }
        return false;
    }

    /**
     * Returns `true` if the result is `Err` and the value inside of it satisfies the predicate `func`.
     * @param func The predicate function to test the `Err` value.
     * @returns `true` if `Err` and the predicate returns `true`, `false` otherwise.
     */
    public isErrAnd(func: (error: string) => boolean): boolean {
        if (isErr(this.result)) {
            return func(this.result.error);
        }
        return false;
    }

    /**
     * Returns the contained `Ok` value, or throws an error if the `SafeResult` is `Err`.
     * Use with caution, as this can lead to unhandled exceptions.
     * @returns The contained `Ok` value.
     * @throws An `Error` if the result is `Err`, with the error message as its content.
     */
    public unwrap(): T {
        if (isOk(this.result)) {
            return this.result.value;
        }
        throw new Error(
            `Attempted to unwrap an 'Err' result: ${this.result.error}`
        );
    }

    /**
     * Returns the contained `Ok` value, or throws an error with the provided message
     * if the `SafeResult` is `Err`.
     * Use with caution, as this can lead to unhandled exceptions.
     * @param message The message to use if the result is `Err`.
     * @returns The contained `Ok` value.
     * @throws An `Error` with the specified message if the result is `Err`.
     */
    public expect(message: string): T {
        if (isOk(this.result)) {
            return this.result.value;
        }
        throw new Error(message);
    }

    /**
     * Returns the contained `Ok` value or a provided default value if the `SafeResult` is `Err`.
     * @param defaultValue The default value to return if the result is `Err`.
     * @returns The contained `Ok` value or the default value.
     */
    public unwrapOr(defaultValue: T): T {
        if (isOk(this.result)) {
            return this.result.value;
        }
        return defaultValue;
    }

    /**
     * Returns the contained `Ok` value or computes it from a closure if the `SafeResult` is `Err`.
     * @param onErrorFunc The function to call if the result is `Err`, which computes the default value.
     * @returns The contained `Ok` value or the result of `onErrorFunc`.
     */
    public unwrapOrElse(onErrorFunc: (error: string) => T): T {
        if (isOk(this.result)) {
            return this.result.value;
        }
        return onErrorFunc(this.result.error);
    }

    /**
     * Returns the contained `Err` value, or throws an error if the `SafeResult` is `Ok`.
     * Use with caution, as this can lead to unhandled exceptions.
     * @returns An `Error` object containing the error message.
     * @throws An `Error` if the result is `Ok`.
     */
    public unwrapErr(): Error {
        if (isErr(this.result)) {
            return new Error(this.result.error);
        }
        throw new Error('Attempted to unwrap `Err` from an `Ok` result.');
    }

    /**
     * Returns the contained `Err` value, or throws an error with the provided message
     * if the `SafeResult` is `Ok`.
     * Use with caution, as this can lead to unhandled exceptions.
     * @param message The message to use if the result is `Ok`.
     * @returns An `Error` object containing the error message.
     * @throws An `Error` with the specified message if the result is `Ok`.
     */
    public expectErr(message: string): Error {
        if (isErr(this.result)) {
            return new Error(this.result.error);
        }
        throw new Error(message);
    }

    /**
     * Maps an `OkResult<T>` to `OkResult<U>` by applying a function to the contained value,
     * or returns the original `ErrResult` if the `SafeResult` is `Err`.
     * @param transform The function to apply to the `Ok` value.
     * @returns A new `SafeResult<U>` with the transformed value or the original error.
     */
    public map<U>(transform: (value: T) => U): SafeResult<U> {
        if (isOk(this.result)) {
            const value = transform(this.result.value);
            return new SafeResult({ value });
        }
        return new SafeResult(this.result);
    }

    /**
     * Maps an `ErrResult` to a new `ErrResult` by applying a function to the contained error,
     * or returns the original `OkResult` if the `SafeResult` is `Ok`.
     * The function's return value is converted to a string error message.
     * @param transform The function to apply to the `Err` value.
     * @returns A new `SafeResult<T>` with the transformed error or the original successful value.
     */
    public mapErr<U>(transform: (error: string) => U): SafeResult<T> {
        if (isErr(this.result)) {
            const error = convertErrorToString(transform(this.result.error));
            return new SafeResult({ error });
        }
        return new SafeResult(this.result);
    }

    /**
     * Returns `res` if the `SafeResult` is `Ok`, otherwise returns the `Err` value of `this`.
     * @param otherResult The other `SafeResult` to return if `this` is `Ok`.
     * @returns `otherResult` if `this` is `Ok`, otherwise `this` (containing the error).
     */
    public and<U>(otherResult: SafeResult<U>): SafeResult<U> {
        if (isOk(this.result)) {
            return otherResult;
        }
        return new SafeResult(this.result);
    }

    /**
     * Calls `transform` if the `SafeResult` is `Ok`, otherwise returns the `Err` value of `this`.
     * This is a monadic bind operation, useful for chaining operations that might fail.
     * @param transform The function to call with the `Ok` value, which returns a new `SafeResult`.
     * @returns A new `SafeResult` from the `transform` function or the original error.
     */
    public andThen<U>(transform: (value: T) => SafeResult<U>): SafeResult<U> {
        if (isOk(this.result)) {
            return transform(this.result.value);
        }
        return new SafeResult(this.result);
    }

    /**
     * Returns `this` if the `SafeResult` is `Ok`, otherwise returns `otherResult`.
     * @param otherResult The other `SafeResult` to return if `this` is `Err`.
     * @returns `this` if `Ok`, otherwise `otherResult`.
     */
    public or(otherResult: SafeResult<T>): SafeResult<T> {
        if (isOk(this.result)) {
            return this;
        }
        return otherResult;
    }

    /**
     * Returns `this` if the `SafeResult` is `Ok`, otherwise calls `onErrorFunc` and returns the result.
     * @param onErrorFunc The function to call with the `Err` value, which returns a new `SafeResult`.
     * @returns `this` if `Ok`, otherwise the result of `onErrorFunc`.
     */
    public orElse(onErrorFunc: (error: string) => SafeResult<T>): SafeResult<T> {
        if (isOk(this.result)) {
            return this;
        }
        return onErrorFunc(this.result.error);
    }

    /**
     * Returns the contained `Ok` value if the result is `Ok`, otherwise returns `undefined`.
     * @returns The `Ok` value or `undefined`.
     */
    public ok(): T | undefined {
        if (isOk(this.result)) {
            return this.result.value;
        }
        return undefined;
    }

    /**
     * Returns the contained `Err` value if the result is `Err`, otherwise returns `undefined`.
     * @returns The `Err` message or `undefined`.
     */
    public err(): string | undefined {
        if (isErr(this.result)) {
            return this.result.error;
        }
        return undefined;
    }

    /**
     * Converts the `SafeResult` back to its underlying `Result` type.
     * @returns The `Result<T>` object.
     */
    public toResult(): Result<T> {
        return this.result;
    }
}

const isNone = <T>(value?: T): value is undefined => value === undefined;
const isSome = <T>(value?: T): value is T => value !== undefined;

/**
 * A class providing a functional way to handle optional values,
 * representing either the presence (Some) or absence (None) of a value.
 * Inspired by Rust's `Option` enum, it helps avoid common `null` or `undefined` issues.
 */
class Option<T> {

    /**
     * Static factory method to create a new `Option` instance from a value or a Promise resolving to a value.
     * It handles potential rejections during promise resolution by returning a `None` Option.
     * @param value An optional value or a Promise resolving to an optional value.
     * @returns A Promise that resolves to an `Option<T>`.
     */
    public static readonly From = async<T>(value?: T | Promise<T | undefined>): Promise<Option<T>> => {
        try {
            const res = await value;
            return new Option(res);
        }
        catch {
            return new Option<T>();
        }
    }

    private value?: T;

    /**
     * Constructs a new `Option` instance.
     * @param value The initial value to encapsulate. If undefined, it represents a `None` state.
     */
    constructor(value?: T) {
        this.value = value;
    }

    /**
     * Returns `true` if the `Option` contains a value (`Some`).
     * @returns `true` if the option is `Some`, `false` otherwise.
     */
    public isSome(): boolean {
        return isSome(this.value);
    }

    /**
     * Returns `true` if the `Option` does not contain a value (`None`).
     * @returns `true` if the option is `None`, `false` otherwise.
     */
    public isNone(): boolean {
        return isNone(this.value);
    }

    /**
      * Returns `true` if the `Option` is `Some` and the value inside of it satisfies the predicate `func`.
      * @param func The predicate function to test the `Some` value.
      * @returns `true` if the option is `Some` and the predicate returns `true`, `false` otherwise.
      */
    public isSomeAnd(func: (value: T) => boolean): boolean {
        if (isSome(this.value)) {
            return func(this.value);
        }
        return false;
    }

    /**
    * Returns `true` if the `Option` is `None` and the predicate `func` returns `true`.
    * @param func The predicate function to test the `None` state.
    * @returns `true` if the option is `None` and the predicate returns `true`, `false` otherwise.
    */
    public isNoneAnd(func: () => boolean): boolean {
        if (isNone(this.value)) {
            return func();
        }
        return false;
    }

    /**
     * Returns the contained `Some` value, or throws an error if the `Option` is `None`.
     * Use with caution, as this can lead to unhandled exceptions.
     * @returns The contained `Some` value.
     * @throws An `Error` if the option is `None`.
     */
    public unwrap(): T {
        if (isSome(this.value)) {
            return this.value;
        }
        throw new Error();
    }

    /**
     * Returns the contained `Some` value, or throws an error with the provided message
     * if the `Option` is `None`.
     * Use with caution, as this can lead to unhandled exceptions.
     * @param message The message to use if the option is `None`.
     * @returns The contained `Some` value.
     * @throws An `Error` with the specified message if the option is `None`.
     */
    public expect(message: string): T {
        if (isSome(this.value)) {
            return this.value;
        }
        throw new Error(message);
    }

    /**
     * Returns the contained `Some` value or a provided default value if the `Option` is `None`.
     * @param defaultValue The default value to return if the option is `None`.
     * @returns The contained `Some` value or the default value.
     */
    public unwrapOr(_default: T): T {
        if (isSome(this.value)) {
            return this.value;
        }
        return _default;
    }

    /**
     * Returns the contained `Some` value or computes it from a closure if the `Option` is `None`.
     * @param onNoneFunc The function to call if the option is `None`, which computes the default value.
     * @returns The contained `Some` value or the result of `onNoneFunc`.
     */
    public unwrapOrElse(func: () => T): T {
        if (isSome(this.value)) {
            return this.value;
        }
        return func();
    }

    /**
     * Maps a `Some` value to a new `Some` value by applying a function to the contained value,
     * or returns `None` if the `Option` is `None`.
     * @param transform The function to apply to the `Some` value.
     * @returns A new `Option<U>` with the transformed value or `None`.
     */
    public map<U>(func: (value: T) => U): Option<U> {
        if (isSome(this.value)) {
            return new Option(func(this.value));
        }
        return new Option<U>(undefined);
    }

    /**
     * Calls `transform` if the `Option` is `Some`, otherwise returns `None`.
     * This is a monadic bind operation, useful for chaining operations that might return an `Option`.
     * @param transform The function to call with the `Some` value, which returns a new `Option`.
     * @returns A new `Option` from the `transform` function or `None`.
     */
    public andThen<U>(func: (value: T) => Option<U>): Option<U> {
        if (isSome(this.value)) {
            return func(this.value);
        }
        return new Option<U>(undefined);
    }

    /**
     * Returns `other` if the `Option` is `Some`, otherwise returns `None`.
     * @param other The other `Option` to return if `this` is `Some`.
     * @returns `other` if `this` is `Some`, otherwise `None`.
     */
    public and<U>(other: Option<U>): Option<U> {
        if (isSome(this.value)) {
            return other;
        }
        return new Option<U>(undefined);
    }

    /**
     * Returns `this` if the `Option` is `Some`, otherwise returns `other`.
     * @param other The other `Option` to return if `this` is `None`.
     * @returns `this` if `Some`, otherwise `other`.
     */
    public or(other: Option<T>): Option<T> {
        if (isSome(this.value)) {
            return this;
        }
        return other;
    }

    /**
     * Returns `Some` if exactly one of `this` or `other` is `Some`, otherwise returns `None`.
     * This is an exclusive OR operation for `Option` types.
     * @param other The other `Option` to compare with.
     * @returns An `Option` containing the value from the `Some` option if only one is `Some`, otherwise `None`.
     */
    public xor(other: Option<T>): Option<T> {
        const some = isSome(this.value);
        if (some === other.isSome()) {
            return new Option<T>(undefined);
        }
        if (some) {
            return this;
        }
        return other;
    }

    /**
     * Takes the value out of the `Option`, leaving `None` in its place.
     * This effectively consumes the value, making the current `Option` `None`.
     * @returns A new `Option` containing the value that was previously in `this`, or `None`.
     */
    public take(): Option<T> {
        const option = new Option(this.value);
        this.value = undefined;
        return option;
    }

    /**
     * Converts the `Option` into a `SafeResult<T>`.
     * If the `Option` is `Some`, it returns `OkResult<T>`.
     * If the `Option` is `None`, it returns `ErrResult` with the provided error.
     * @param err The `Error` object to use if the option is `None`.
     * @returns A `SafeResult<T>` representing either the `Some` value or the provided error.
     */
    public okOr(err: Error): SafeResult<T> {
        const value = this.value;
        if (isSome(value)) {
            return new SafeResult({ value });
        } else {
            const error = err.message;
            return new SafeResult({ error });
        }
    }

    /**
     * Converts the `Option` into a `SafeResult<T>`.
     * If the `Option` is `Some`, it returns `OkResult<T>`.
     * If the `Option` is `None`, it returns `ErrResult` with an error computed by the provided closure.
     * @param onErrorFunc The function to call if the option is `None`, which computes the `Error`.
     * @returns A `SafeResult<T>` representing either the `Some` value or the computed error.
     */
    public okOrElse(func: () => Error): SafeResult<T> {
        const value = this.value;
        if (isSome(value)) {
            return new SafeResult({ value });
        } else {
            const error = func().message;
            return new SafeResult({ error });
        }
    }

}

/**
 * Creates a new `Option` instance that contains a value (`Some`).
 * This is a convenience function for encapsulating a present value within an `Option`.
 * It's particularly useful when you explicitly want to indicate the presence of a non-null or non-undefined value.
 * @param value The value to be wrapped within the `Option`.
 * @returns An `Option<T>` instance representing the "Some" state with the provided value.
 */
export const Some = <T>(value?: T) => new Option<T>(value);

/**
 * Creates a new `Option` instance that represents the absence of a value (`None`).
 * This function serves as a straightforward way to create an `Option` indicating that no value is present.
 * It's often used to explicitly handle cases where a value might be missing,
 * avoiding the need for `null` or `undefined` checks.
 * @returns An `Option<T>` instance representing the "None" state.
 */
export const None = <T>() => new Option<T>();

const isOptionMatch = <T>(o: Option<T> | SafeResult<T>): o is Option<T> => o instanceof Option;
const isResultMatch = <T>(o: Option<T> | SafeResult<T>): o is SafeResult<T> => o instanceof SafeResult;

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
export const match = <T>(input: Option<T> | SafeResult<T>):
    GoifyResult<T, Error> =>
    goifySync(() => {
        if (isOptionMatch(input)) {
            return input.expect("Option is None");
        }
        else if (isResultMatch(input)) {
            return input.unwrap();
        }
        throw new Error("Unhandled input type for match function.");
    });

export const matchAsync = async<T>(input: Promise<Option<T> | SafeResult<T>>):
    Promise<GoifyResult<T, Error>> =>
    goify(async () => {
        const result = await input;
        if (isOptionMatch(result)) {
            return result.expect("Option is None");
        }
        else if (isResultMatch(result)) {
            return result.unwrap();
        }

        throw new Error("Unhandled input type for match function.");
    });

export type SafeOption<T> = InstanceType<typeof Option<T>>