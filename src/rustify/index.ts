/**
 * @file This module provides a robust set of types and utilities for handling
 * operations that can either succeed or fail, and operations that may or
 * may not return a value. It introduces `Result` and `Option` types,
 * inspired by Rust's error handling, to promote explicit error management
 * and prevent unexpected `null` or `undefined` values.
 */

/**
 * @interface OutcomeOk
 * @template T The type of the successful value.
 * @description Represents a successful outcome containing a value of type T.
 */
type OutcomeOk<T> = { value: T };

/**
 * @interface OutcomeErr
 * @template T The type of the error value.
 * @description Represents a failed outcome containing an error of type T.
 */
type OutcomeErr<T> = { error: T };

/**
 * @template T The type of the successful value.
 * @description A union type representing an outcome that can be successfully
 * serialized or contains a string error. This is useful for
 * API responses or logging where errors need to be stringified.
 */
export type SerializableOutcome<T> = (OutcomeOk<T> | OutcomeErr<string>) & { ok: boolean };

/**
 * @template T The type of the successful value.
 * @template E The type of the error value.
 * @description A union type representing an outcome that can either be a
 * success (containing a value of type T) or a failure (containing
 * an error of type E). This is the fundamental building block for
 * the `Result` type.
 */
export type Outcome<T, E> = OutcomeOk<T> | OutcomeErr<E>;

/**
 * @function convertErrorToString
 * @template T
 * @param {unknown} err The error to convert.
 * @returns {string} A string representation of the error.
 * @description Converts various error types into a standardized string format.
 * It handles strings, `Error` objects, objects with a 'message'
 * property, and attempts JSON serialization for other types,
 * falling back to `String()` conversion.
 */
function convertErrorToString(err: unknown): string {
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
 * @function buildSerializableOutcome
 * @template T The type of the successful result.
 * @param {() => T} operation A synchronous function that returns a value of type T.
 * @returns {SerializableOutcome<T>} A `SerializableOutcome` representing the result of the operation.
 * @description Overload for synchronous operations.
 */
export function buildSerializableOutcome<T>(operation: () => T): SerializableOutcome<T>;
/**
 * @function buildSerializableOutcome
 * @template T The type of the successful result.
 * @param {() => Promise<T>} operation An asynchronous function that returns a Promise resolving to a value of type T.
 * @returns {Promise<SerializableOutcome<T>>} A Promise that resolves to a `SerializableOutcome` representing the result of the operation.
 * @description Overload for asynchronous operations.
 */
export function buildSerializableOutcome<T>(operation: () => Promise<T>): Promise<SerializableOutcome<T>>;
/**
 * @function buildSerializableOutcome
 * @template T The type of the successful result.
 * @param {() => Promise<T> | T} operation A function that can be either synchronous or asynchronous, returning a value of type T or a Promise resolving to T.
 * @returns {Promise<SerializableOutcome<T>> | SerializableOutcome<T>} A `SerializableOutcome` or a Promise resolving to a `SerializableOutcome`, representing the result of the operation.
 * @description Executes an operation (synchronous or asynchronous) and wraps its
 * result in a `SerializableOutcome`. If the operation throws an error
 * or the Promise rejects, the error is caught and converted to a
 * string within an `OutcomeErr`.
 */
export function buildSerializableOutcome<T>(operation: () => Promise<T> | T): Promise<SerializableOutcome<T>> | SerializableOutcome<T> {
    try {
        const result = operation();
        if (result instanceof Promise) {
            return result.then((value) => ({ value, ok: true })).catch((err) => ({ error: convertErrorToString(err), ok: false }));
        }
        return { value: result, ok: true };
    } catch (err) {
        const error = convertErrorToString(err);
        return { error, ok: false };
    }
};

/**
 * @function buildResult
 * @template T The type of the successful result.
 * @template E The type of the error. Defaults to `Error`.
 * @param {() => Promise<T>} operation An asynchronous function that returns a Promise resolving to a value of type T.
 * @returns {Promise<Result<T, E>>} A Promise that resolves to a `Result` representing the result of the operation.
 * @description Overload for asynchronous operations.
 */
export function buildResult<T, E = Error>(operation: () => Promise<T>): Promise<Result<T, E>>;
/**
 * @function buildResult
 * @template T The type of the successful result.
 * @template E The type of the error. Defaults to `Error`.
 * @param {() => T} operation A synchronous function that returns a value of type T.
 * @returns {Result<T, E>} A `Result` representing the result of the operation.
 * @description Overload for synchronous operations.
 */
export function buildResult<T, E = Error>(operation: () => T): Result<T, E>;
/**
 * @function buildResult
 * @template T The type of the successful result.
 * @template E The type of the error. Defaults to `Error`.
 * @param {() => Promise<T> | T} operation A function that can be either synchronous or asynchronous, returning a value of type T or a Promise resolving to T.
 * @returns {Promise<Result<T, E>> | Result<T, E>} A `Result` or a Promise resolving to a `Result`, representing the result of the operation.
 * @description Executes an operation (synchronous or asynchronous) and wraps its
 * result in a `Result` type. If the operation throws an error or the
 * Promise rejects, the error is caught and wrapped in an `Err`.
 */
export function buildResult<T, E = Error>(operation: () => Promise<T> | T): Promise<Result<T, E>> | Result<T, E> {
    try {
        const result = operation();
        if (result instanceof Promise) {
            return result.then(value => Ok<T, E>(value)).catch((err) => Err(err));
        }
        return Ok<T, E>(result);
    }
    catch (err) {
        return Err<T, E>(err as E);
    }
};

/**
 * @function isOk
 * @template T The type of the successful value.
 * @template E The type of the error value.
 * @param {Outcome<T, E>} outcome The outcome to check.
 * @returns {boolean} True if the outcome is `OutcomeOk`, false otherwise.
 * @description Type guard to check if an `Outcome` is a successful `OutcomeOk`.
 */
const isOk = <T, E>(outcome: Outcome<T, E> | SerializableOutcome<T>): outcome is OutcomeOk<T> => 'value' in outcome || ('ok' in outcome && outcome.ok === true);

/**
 * @function isErr
 * @template T The type of the successful value.
 * @template E The type of the error value.
 * @param {Outcome<T, E>} outcome The outcome to check.
 * @returns {boolean} True if the outcome is `OutcomeErr`, false otherwise.
 * @description Type guard to check if an `Outcome` is a failed `OutcomeErr`.
 */
const isErr = <T, E>(outcome: Outcome<T, E> | SerializableOutcome<T>): outcome is OutcomeErr<E> => 'error' in outcome || ('ok' in outcome && outcome.ok === false);

/**
 * @function Ok
 * @template T The type of the successful value.
 * @template E The type of the error value.
 * @param {T} value The successful value.
 * @returns {Result<T, E>} A new `Result` instance representing a successful outcome.
 * @description Creates a new `Result` instance indicating a successful operation.
 */
export const Ok = <T, E>(value: T) => new Result<T, E>({ value });
/**
 * @function Err
 * @template T The type of the successful value.
 * @template E The type of the error value.
 * @param {E} error The error value.
 * @returns {Result<T, E>} A new `Result` instance representing a failed outcome.
 * @description Creates a new `Result` instance indicating a failed operation.
 */
export const Err = <T, E>(error: E) => new Result<T, E>({ error });

/**
 * @class Result
 * @template T The type of the successful value.
 * @template E The type of the error value.
 * @description A class that represents either a success (`Ok`) with a value of type `T`
 * or a failure (`Err`) with an error of type `E`. This is a common
 * pattern for error handling in functional programming, inspired by Rust.
 */
export class Result<T, E> {
    /**
     * @static
     * @function From
     * @template T The type of the successful value.
     * @param {SerializableOutcome<T>} input A `SerializableOutcome` to convert.
     * @returns {Result<T, Error>} A `Result` instance, converting string errors to `Error` objects.
     * @description Overload for synchronous `SerializableOutcome` conversion.
     */
    public static From<T>(input: SerializableOutcome<T>): Result<T, Error>;
    /**
     * @static
     * @function From
     * @template T The type of the successful value.
     * @param {Promise<SerializableOutcome<T>>} input A Promise resolving to a `SerializableOutcome` to convert.
     * @returns {Promise<Result<T, Error>>} A Promise resolving to a `Result` instance, converting string errors to `Error` objects.
     * @description Overload for asynchronous `SerializableOutcome` conversion.
     */
    public static From<T>(input: Promise<SerializableOutcome<T>>): Promise<Result<T, Error>>;
    /**
     * @static
     * @function From
     * @template T The type of the successful value.
     * @param {SerializableOutcome<T> | Promise<SerializableOutcome<T>>} input A `SerializableOutcome` or a Promise resolving to it.
     * @returns {Result<T, Error> | Promise<Result<T, Error>>} A `Result` or a Promise resolving to a `Result`, converting `SerializableOutcome` to `Result`.
     * @description Converts a `SerializableOutcome` (or a Promise resolving to one)
     * into a `Result` type. It specifically transforms string errors
     * from `SerializableOutcome` into `Error` objects for the `Result`.
     */
    public static From<T>(input: SerializableOutcome<T> | Promise<SerializableOutcome<T>>) {
        if (input instanceof Promise) {
            return input.then(result => {
                if (isOk(result)) {
                    const value = result.value;
                    return Ok(value);
                } else {
                    return Err(new Error(result.error));
                }
            }).catch(err => Err(new Error(convertErrorToString(err))));
        } else {

            if (isOk(input)) {
                const value = input.value;
                return new Result({ value });
            }
            else {
                return new Result({ error: new Error(input.error) });
            }

        }
    }

    private outcome: Outcome<T, E>;

    /**
     * @constructor
     * @param {Outcome<T, E>} outcome The internal outcome (either `OutcomeOk` or `OutcomeErr`).
     * @description Creates a new `Result` instance. This constructor is typically
     * used internally; prefer using `Ok()` or `Err()` factory functions.
     */
    constructor(outcome: Outcome<T, E>) {
        this.outcome = outcome;
    }

    /**
     * @method isOk
     * @returns {boolean} True if the result is `Ok`, false otherwise.
     * @description Checks if the `Result` contains a successful value.
     * @typeParam this - Narrows the type of `this` to `Result<T, never>` if true.
     */
    public isOk(): this is Result<T, never> {
        return isOk(this.outcome);
    }

    /**
     * @method isErr
     * @returns {boolean} True if the result is `Err`, false otherwise.
     * @description Checks if the `Result` contains an error.
     * @typeParam this - Narrows the type of `this` to `Result<never, E>` if true.
     */
    public isErr(): this is Result<never, E> {
        return isErr(this.outcome);
    }

    /**
     * @method isOkAnd
     * @param {(value: T) => boolean} func A predicate function to apply if the result is `Ok`.
     * @returns {boolean} True if the result is `Ok` and the predicate returns true, false otherwise.
     * @description Checks if the `Result` is `Ok` and the contained value satisfies the given predicate.
     */
    public isOkAnd(func: (value: T) => boolean): boolean {
        if (isOk(this.outcome)) {
            return func(this.outcome.value);
        }
        return false;
    }

    /**
     * @method isErrAnd
     * @param {(error: E) => boolean} func A predicate function to apply if the result is `Err`.
     * @returns {boolean} True if the result is `Err` and the predicate returns true, false otherwise.
     * @description Overload for synchronous predicate.
     */
    public isErrAnd(func: (error: E) => boolean): boolean
    /**
     * @method isErrAnd
     * @param {(error: E) => Promise<boolean>} func A predicate function to apply if the result is `Err`.
     * @returns {Promise<boolean>} A Promise that resolves to true if the result is `Err` and the predicate returns true, false otherwise.
     * @description Overload for asynchronous predicate.
     */
    public isErrAnd(func: (error: E) => Promise<boolean>): Promise<boolean>
    /**
     * @method isErrAnd
     * @param {(error: E) => boolean | Promise<boolean>} func A predicate function to apply if the result is `Err`.
     * @returns {boolean | Promise<boolean>} True if the result is `Err` and the predicate returns true, false otherwise (or a Promise resolving to this).
     * @description Checks if the `Result` is `Err` and the contained error satisfies the given predicate.
     */
    public isErrAnd(func: (error: E) => boolean | Promise<boolean>): boolean | Promise<boolean> {
        if (isErr(this.outcome)) {
            return func(this.outcome.error);
        }
        return false;
    }

    /**
     * @method unwrap
     * @returns {T} The contained successful value.
     * @throws {Error} If the result is `Err`, an error is thrown with the error message.
     * @description Returns the contained `Ok` value.
     * Throws an `Error` if the value is an `Err`. Use with caution.
     */
    public unwrap(): T {
        if (isOk(this.outcome)) {
            return this.outcome.value;
        }
        throw new Error(
            `Attempted to unwrap an 'Err' result: ${this.outcome.error}`
        );
    }

    /**
     * @method expect
     * @param {string} message The error message to use if the result is `Err`.
     * @returns {T} The contained successful value.
     * @throws {Error} If the result is `Err`, an error is thrown with the provided message.
     * @description Returns the contained `Ok` value.
     * Throws an `Error` with a custom message if the value is an `Err`. Use with caution.
     */
    public expect(message: string): T {
        if (isOk(this.outcome)) {
            return this.outcome.value;
        }
        throw new Error(message);
    }

    /**
     * @method unwrapOr
     * @param {T} defaultValue The default value to return if the result is `Err`.
     * @returns {T} The contained successful value if `Ok`, otherwise the provided `defaultValue`.
     * @description Returns the contained `Ok` value or a provided default.
     */
    public unwrapOr(defaultValue: T): T {
        if (isOk(this.outcome)) {
            return this.outcome.value;
        }
        return defaultValue;
    }

    /**
     * @method unwrapOrElse
     * @param {(error: E) => T} onErrorFunc A function that produces a default value if the result is `Err`.
     * @returns {T} The contained successful value if `Ok`, otherwise the result of `onErrorFunc`.
     * @description Overload for synchronous error handling function.
     */
    public unwrapOrElse(onErrorFunc: (error: E) => T): T
    /**
     * @method unwrapOrElse
     * @param {(error: E) => Promise<T>} onErrorFunc A function that produces a Promise resolving to a default value if the result is `Err`.
     * @returns {Promise<T>} A Promise resolving to the contained successful value if `Ok`, otherwise the result of `onErrorFunc`.
     * @description Overload for asynchronous error handling function.
     */
    public unwrapOrElse(onErrorFunc: (error: E) => Promise<T>): Promise<T>
    /**
     * @method unwrapOrElse
     * @param {(error: E) => T | Promise<T>} onErrorFunc A function that produces a default value or a Promise resolving to one if the result is `Err`.
     * @returns {T | Promise<T>} The contained successful value if `Ok`, otherwise the result of `onErrorFunc` (or a Promise resolving to this).
     * @description Returns the contained `Ok` value or computes a default from a
     * function argument if the value is an `Err`.
     */
    public unwrapOrElse(onErrorFunc: (error: E) => T | Promise<T>): T | Promise<T> {
        if (isOk(this.outcome)) {
            return this.outcome.value;
        }
        return onErrorFunc(this.outcome.error);
    }

    /**
     * @method unwrapErr
     * @returns {E} The contained error value.
     * @throws {Error} If the result is `Ok`, an error is thrown.
     * @description Returns the contained `Err` value.
     * Throws an `Error` if the value is an `Ok`. Use with caution.
     */
    public unwrapErr(): E {
        if (isErr(this.outcome)) {
            return this.outcome.error;
        }
        throw new Error('Attempted to unwrap `Err` from an `Ok` result.');
    }

    /**
     * @method expectErr
     * @param {string} message The error message to use if the result is `Ok`.
     * @returns {E} The contained error value.
     * @throws {Error} If the result is `Ok`, an error is thrown with the provided message.
     * @description Returns the contained `Err` value.
     * Throws an `Error` with a custom message if the value is an `Ok`. Use with caution.
     */
    public expectErr(message: string): E {
        if (isErr(this.outcome)) {
            return this.outcome.error;
        }
        throw new Error(message);
    }

    /**
     * @method map
     * @template U The type of the new successful value.
     * @param {(value: T) => U} transform A function to apply to the contained `Ok` value.
     * @returns {Result<U, E>} A new `Result` with the transformed value if `Ok`, otherwise the original `Err`.
     * @description Overload for synchronous transformation.
     */
    public map<U>(transform: (value: T) => U): Result<U, E>
    /**
     * @method map
     * @template U The type of the new successful value.
     * @param {(value: T) => Promise<U>} transform A function to apply to the contained `Ok` value, returning a Promise.
     * @returns {Promise<Result<U, E>>} A Promise resolving to a new `Result` with the transformed value if `Ok`, otherwise the original `Err`.
     * @description Overload for asynchronous transformation.
     */
    public map<U>(transform: (value: T) => Promise<U>): Promise<Result<U, E>>
    /**
     * @method map
     * @template U The type of the new successful value.
     * @param {(value: T) => U | Promise<U>} transform A function to apply to the contained `Ok` value, which can be synchronous or asynchronous.
     * @returns {Result<U, E> | Promise<Result<U, E>>} A new `Result` or a Promise resolving to a new `Result` with the transformed value if `Ok`, otherwise the original `Err`.
     * @description Maps a `Result<T, E>` to `Result<U, E>` by applying a function
     * to a contained `Ok` value, leaving an `Err` value untouched.
     */
    public map<U>(transform: (value: T) => U | Promise<U>): Result<U, E> | Promise<Result<U, E>> {
        if (isOk(this.outcome)) {
            const result = transform(this.outcome.value);
            if (result instanceof Promise) {
                return result.then(value => Ok(value));
            }
            return Ok(result);
        }
        // If it's an Err, we return a new Result with the original error type, but the new value type
        return new Result<U, E>(this.outcome as OutcomeErr<E>);
    }

    /**
     * @method mapErr
     * @template U The type of the new error value.
     * @param {(error: E) => U} transform A function to apply to the contained `Err` value.
     * @returns {Result<T, U>} A new `Result` with the transformed error if `Err`, otherwise the original `Ok`.
     * @description Overload for synchronous error transformation.
     */
    public mapErr<U>(transform: (error: E) => U): Result<T, U>
    /**
     * @method mapErr
     * @template U The type of the new error value.
     * @param {(error: E) => Promise<U>} transform A function to apply to the contained `Err` value, returning a Promise.
     * @returns {Result<T, U>} A new `Result` with the transformed error if `Err`, otherwise the original `Ok`.
     * @description Overload for asynchronous error transformation.
     */
    public mapErr<U>(transform: (error: E) => Promise<U>): Result<T, U>
    /**
     * @method mapErr
     * @template U The type of the new error value.
     * @param {(error: E) => U | Promise<U>} transform A function to apply to the contained `Err` value, which can be synchronous or asynchronous.
     * @returns {Result<T, U> | Promise<Result<T, U>>} A new `Result` or a Promise resolving to a new `Result` with the transformed error if `Err`, otherwise the original `Ok`.
     * @description Maps a `Result<T, E>` to `Result<T, U>` by applying a function
     * to a contained `Err` value, leaving an `Ok` value untouched.
     */
    public mapErr<U>(transform: (error: E) => U | Promise<U>): Result<T, U> | Promise<Result<T, U>> {
        if (isErr(this.outcome)) {
            const result = transform(this.outcome.error);
            if (result instanceof Promise) {
                return result.then((error) => Err(error));
            }
            return Err(result);
        }
        // If it's an Ok, we return a new Result with the original value type, but the new error type
        return Ok(this.outcome.value as T) as Result<T, U>;
    }

    /**
     * @method and
     * @param {Result<T, E>} otherResult Another `Result` to combine with.
     * @returns {Result<T, E>} If this `Result` is `Ok`, returns `otherResult`. Otherwise, returns this `Err`.
     * @description Returns `otherResult` if the `Result` is `Ok`, otherwise returns `Err` with the current error.
     */
    public and(otherResult: Result<T, E>): Result<T, E> {
        if (isOk(this.outcome)) {
            return otherResult;
        }
        return Err(this.outcome.error);
    }

    /**
     * @method andThen
     * @template U The type of the successful value of the new `Result`.
     * @param {(value: T) => Result<U, E>} transform A function that takes the `Ok` value and returns a new `Result`.
     * @returns {Result<U, E>} The result of applying `transform` if `Ok`, otherwise the original `Err`.
     * @description Overload for synchronous transformation.
     */
    public andThen<U>(transform: (value: T) => Result<U, E>): Result<U, E>;
    /**
     * @method andThen
     * @template U The type of the successful value of the new `Result`.
     * @param {(value: T) => Promise<Result<U, E>>} transform A function that takes the `Ok` value and returns a Promise resolving to a new `Result`.
     * @returns {Promise<Result<U, E>>} A Promise resolving to the result of applying `transform` if `Ok`, otherwise the original `Err`.
     * @description Overload for asynchronous transformation.
     */
    public andThen<U>(transform: (value: T) => Promise<Result<U, E>>): Promise<Result<U, E>>;
    /**
     * @method andThen
     * @template U The type of the successful value of the new `Result`.
     * @param {(value: T) => Result<U, E> | Promise<Result<U, E>>} transform A function that takes the `Ok` value and returns a new `Result` (synchronous or asynchronous).
     * @returns {Result<U, E> | Promise<Result<U, E>>} The result of applying `transform` if `Ok`, otherwise the original `Err`.
     * @description Calls `transform` if the `Result` is `Ok`, otherwise returns the `Err` value.
     * This is useful for chaining operations that might fail.
     */
    public andThen<U>(transform: (value: T) => Result<U, E> | Promise<Result<U, E>>): Result<U, E> | Promise<Result<U, E>> {
        if (isOk(this.outcome)) {
            return transform(this.outcome.value);
        }
        return Err(this.outcome.error);
    }

    /**
     * @method or
     * @param {Result<T, E>} otherResult Another `Result` to combine with.
     * @returns {Result<T, E>} If this `Result` is `Ok`, returns this `Ok`. Otherwise, returns `otherResult`.
     * @description Returns the `Result` if it is `Ok`, otherwise returns `otherResult`.
     */
    public or(otherResult: Result<T, E>): Result<T, E> {
        if (isOk(this.outcome)) {
            return Ok(this.outcome.value);
        }
        return otherResult;
    }

    /**
     * @method orElse
     * @param {(error: E) => Result<T, E>} onErrorFunc A function that takes the `Err` value and returns a new `Result`.
     * @returns {Result<T, E>} If this `Result` is `Ok`, returns this `Ok`. Otherwise, returns the result of `onErrorFunc`.
     * @description Overload for synchronous error handling function.
     */
    public orElse(onErrorFunc: (error: E) => Result<T, E>): Result<T, E>
    /**
     * @method orElse
     * @param {(error: E) => Promise<Result<T, E>>} onErrorFunc A function that takes the `Err` value and returns a Promise resolving to a new `Result`.
     * @returns {Promise<Result<T, E>>} If this `Result` is `Ok`, returns this `Ok`. Otherwise, returns the Promise resolving from `onErrorFunc`.
     * @description Overload for asynchronous error handling function.
     */
    public orElse(onErrorFunc: (error: E) => Promise<Result<T, E>>): Promise<Result<T, E>>
    /**
     * @method orElse
     * @param {(error: E) => Result<T, E> | Promise<Result<T, E>>} onErrorFunc A function that takes the `Err` value and returns a new `Result` (synchronous or asynchronous).
     * @returns {Result<T, E> | Promise<Result<T, E>>} If this `Result` is `Ok`, returns this `Ok`. Otherwise, returns the result of `onErrorFunc` (or a Promise resolving to this).
     * @description Calls `onErrorFunc` if the `Result` is `Err`, otherwise returns the `Ok` value.
     * This is useful for providing a fallback `Result` in case of failure.
     */
    public orElse(onErrorFunc: (error: E) => Result<T, E> | Promise<Result<T, E>>): Result<T, E> | Promise<Result<T, E>> {
        if (isOk(this.outcome)) {
            return Ok(this.outcome.value);
        }
        return onErrorFunc(this.outcome.error);
    }
}

/**
 * @function isNone
 * @template T The type of the optional value.
 * @param {T | undefined} value The value to check.
 * @returns {boolean} True if the value is `undefined`, false otherwise.
 * @description Type guard to check if a value is `undefined` (representing "None").
 */
const isNone = <T>(value?: T): value is undefined => value === undefined;
/**
 * @function isSome
 * @template T The type of the optional value.
 * @param {T | undefined} value The value to check.
 * @returns {boolean} True if the value is not `undefined`, false otherwise.
 * @description Type guard to check if a value is not `undefined` (representing "Some").
 */
const isSome = <T>(value?: T): value is T => value !== undefined;

/**
 * @class Option
 * @template T The type of the contained value.
 * @description A class that represents an optional value: either a value of type `T`
 * (`Some`) or no value (`None`). This helps to explicitly handle the
 * absence of a value, preventing common `null` or `undefined` related bugs.
 */
export class Option<T> {

    /**
     * @static
     * @function From
     * @template T The type of the contained value.
     * @param {T | null | void | undefined} input A value that might be null or undefined.
     * @returns {Result<Option<T>, never>} A `Result` containing an `Option` based on the input. `never` indicates no error possible for synchronous conversion.
     * @description Overload for synchronous input.
     */
    public static From<T>(input?: T | null | void | undefined): Result<Option<T>, never>;
    /**
     * @static
     * @function From
     * @template T The type of the contained value.
     * @template E The type of the error if the Promise rejects.
     * @param {Promise<T | null | void | undefined>} input A Promise resolving to a value that might be null or undefined.
     * @returns {Promise<Result<Option<T>, E>>} A Promise resolving to a `Result` containing an `Option` based on the input.
     * @description Overload for asynchronous input.
     */
    public static From<T, E>(input: Promise<T | null | void | undefined>): Promise<Result<Option<T>, E>>;
    /**
     * @static
     * @function From
     * @template T The type of the contained value.
     * @template E The type of the error if the Promise rejects (only for async).
     * @param {(T | null | void | undefined) | Promise<T | null | void | undefined>} input A value or a Promise resolving to a value that might be null or undefined.
     * @returns {Result<Option<T>, never> | Promise<Result<Option<T>, E>>} A `Result` or a Promise resolving to a `Result`, containing an `Option` based on the input.
     * @description Converts a nullable/undefined value (or a Promise resolving to one)
     * into an `Option` wrapped in a `Result`. This provides a clean way
     * to handle values that might be absent, explicitly representing
     * `null` or `undefined` as `None`.
     */
    public static From<T, E>(input?: (T | null | void | undefined) | Promise<T | null | void | undefined>): Result<Option<T>, never> | Promise<Result<Option<T>, E>> {
        if (input instanceof Promise) {
            return input
                .then(result => Ok<Option<T>, E>(new Option(result)))
                .catch((err: E) => Err<Option<T>, E>(err));
        } else {
            return Ok(new Option(input));
        }
    }

    private value?: T;

    /**
     * @constructor
     * @param {T | null | void} [value] The optional value. If `null` or `undefined`, the Option will be `None`.
     * @description Creates a new `Option` instance. Use `Some()` or `None()` factory functions for convenience.
     */
    constructor(value?: T | null | void) {
        if (value !== undefined && value !== null) {
            this.value = value;
        }
    }

    /**
     * @method isSome
     * @returns {boolean} True if the `Option` contains a value (`Some`), false otherwise.
     * @description Checks if the `Option` contains a value.
     */
    public isSome(): boolean {
        return isSome(this.value);
    }

    /**
     * @method isNone
     * @returns {boolean} True if the `Option` does not contain a value (`None`), false otherwise.
     * @description Checks if the `Option` does not contain a value.
     */
    public isNone(): boolean {
        return isNone(this.value);
    }

    /**
     * @method isSomeAnd
     * @param {(value: T) => boolean} func A predicate function to apply if the option is `Some`.
     * @returns {boolean} True if the option is `Some` and the predicate returns true, false otherwise.
     * @description Overload for synchronous predicate.
     */
    public isSomeAnd(func: (value: T) => boolean): boolean
    /**
     * @method isSomeAnd
     * @param {(value: T) => Promise<boolean>} func A predicate function to apply if the option is `Some`.
     * @returns {Promise<boolean>} A Promise resolving to true if the option is `Some` and the predicate returns true, false otherwise.
     * @description Overload for asynchronous predicate.
     */
    public isSomeAnd(func: (value: T) => Promise<boolean>): Promise<boolean>
    /**
     * @method isSomeAnd
     * @param {(value: T) => boolean | Promise<boolean>} func A predicate function to apply if the option is `Some`.
     * @returns {boolean | Promise<boolean>} True if the option is `Some` and the predicate returns true, false otherwise (or a Promise resolving to this).
     * @description Checks if the `Option` is `Some` and the contained value satisfies the given predicate.
     */
    public isSomeAnd(func: (value: T) => boolean | Promise<boolean>): boolean | Promise<boolean> {
        if (isSome(this.value)) {
            return func(this.value);
        }
        return false;
    }

    /**
     * @method unwrap
     * @returns {T} The contained value.
     * @throws {Error} If the `Option` is `None`, an error is thrown.
     * @description Returns the contained `Some` value.
     * Throws an `Error` if the value is `None`. Use with caution.
     */
    public unwrap(): T {
        if (isSome(this.value)) {
            return this.value;
        }
        throw new Error("Attempted to unwrap a 'None' Option. No value is present.");
    }

    /**
     * @method expect
     * @param {string} message The error message to use if the `Option` is `None`.
     * @returns {T} The contained value.
     * @throws {Error} If the `Option` is `None`, an error is thrown with the provided message.
     * @description Returns the contained `Some` value.
     * Throws an `Error` with a custom message if the value is `None`. Use with caution.
     */
    public expect(message: string): T {
        if (isSome(this.value)) {
            return this.value;
        }
        throw new Error(message);
    }

    /**
     * @method unwrapOr
     * @param {T} _default The default value to return if the `Option` is `None`.
     * @returns {T} The contained value if `Some`, otherwise the provided `_default`.
     * @description Returns the contained `Some` value or a provided default.
     */
    public unwrapOr(_default: T): T {
        if (isSome(this.value)) {
            return this.value;
        }
        return _default;
    }

    /**
     * @method unwrapOrElse
     * @param {() => T} func A function that produces a default value if the `Option` is `None`.
     * @returns {T} The contained value if `Some`, otherwise the result of `func`.
     * @description Overload for synchronous default value function.
     */
    public unwrapOrElse(func: () => T): T
    /**
     * @method unwrapOrElse
     * @param {() => Promise<T>} func A function that produces a Promise resolving to a default value if the `Option` is `None`.
     * @returns {Promise<T>} A Promise resolving to the contained value if `Some`, otherwise the result of `func`.
     * @description Overload for asynchronous default value function.
     */
    public unwrapOrElse(func: () => Promise<T>): Promise<T>
    /**
     * @method unwrapOrElse
     * @param {() => T | Promise<T>} func A function that produces a default value or a Promise resolving to one if the `Option` is `None`.
     * @returns {T | Promise<T>} The contained value if `Some`, otherwise the result of `func` (or a Promise resolving to this).
     * @description Returns the contained `Some` value or computes a default from a
     * function argument if the value is `None`.
     */
    public unwrapOrElse(func: () => T | Promise<T>): T | Promise<T> {
        if (isSome(this.value)) {
            return this.value;
        }
        return func();
    }

    /**
     * @method map
     * @template U The type of the new value.
     * @param {(value: T) => U} func A function to apply to the contained `Some` value.
     * @returns {Option<U>} A new `Option` with the transformed value if `Some`, otherwise `None`.
     * @description Overload for synchronous transformation.
     */
    public map<U>(func: (value: T) => U): Option<U>
    /**
     * @method map
     * @template U The type of the new value.
     * @param {(value: T) => Promise<U>} func A function to apply to the contained `Some` value, returning a Promise.
     * @returns {Promise<Option<U>>} A Promise resolving to a new `Option` with the transformed value if `Some`, otherwise `None`.
     * @description Overload for asynchronous transformation.
     */
    public map<U>(func: (value: T) => Promise<U>): Promise<Option<U>>
    /**
     * @method map
     * @template U The type of the new value.
     * @param {(value: T) => U | Promise<U>} func A function to apply to the contained `Some` value, which can be synchronous or asynchronous.
     * @returns {Option<U> | Promise<Option<U>>} A new `Option` or a Promise resolving to a new `Option` with the transformed value if `Some`, otherwise `None`.
     * @description Maps an `Option<T>` to `Option<U>` by applying a function to a
     * contained `Some` value, leaving a `None` value untouched.
     */
    public map<U>(func: (value: T) => U | Promise<U>): Option<U> | Promise<Option<U>> {
        if (isSome(this.value)) {
            const result = func(this.value);
            if (result instanceof Promise) {
                return result.then((res) => new Option(res));
            }
            return new Option(result);
        }
        return None();
    }

    /**
     * @method andThen
     * @template U The type of the new `Option`'s value.
     * @param {(value: T) => Option<U>} transform A function that takes the `Some` value and returns a new `Option`.
     * @returns {Option<U>} The result of applying `transform` if `Some`, otherwise `None`.
     * @description Overload for synchronous transformation.
     */
    public andThen<U>(transform: (value: T) => Option<U>): Option<U>;
    /**
     * @method andThen
     * @template U The type of the new `Option`'s value.
     * @param {(value: T) => Promise<Option<U>>} transform A function that takes the `Some` value and returns a Promise resolving to a new `Option`.
     * @returns {Promise<Option<U>>} A Promise resolving to the result of applying `transform` if `Some`, otherwise `None`.
     * @description Overload for asynchronous transformation.
     */
    public andThen<U>(transform: (value: T) => Promise<Option<U>>): Promise<Option<U>>;
    /**
     * @method andThen
     * @template U The type of the new `Option`'s value.
     * @param {(value: T) => Option<U> | Promise<Option<U>>} transform A function that takes the `Some` value and returns a new `Option` (synchronous or asynchronous).
     * @returns {Option<U> | Promise<Option<U>>} The result of applying `transform` if `Some`, otherwise `None`.
     * @description Calls `transform` if the `Option` is `Some`, otherwise returns `None`.
     * This is useful for chaining `Option`-returning functions.
     */
    public andThen<U>(transform: (value: T) => Option<U> | Promise<Option<U>>): Option<U> | Promise<Option<U>> {
        if (isSome(this.value)) {
            return transform(this.value);
        }
        return None();
    }

    /**
     * @method and
     * @template U The type of the other `Option`'s value.
     * @param {Option<U>} other Another `Option` to combine with.
     * @returns {Option<U>} If this `Option` is `Some`, returns `other`. Otherwise, returns `None`.
     * @description Returns `other` if the `Option` is `Some`, otherwise returns `None`.
     */
    public and<U>(other: Option<U>): Option<U> {
        if (isSome(this.value)) {
            return other;
        }
        return new Option<U>(undefined);
    }

    /**
     * @method or
     * @param {Option<T>} other Another `Option` to combine with.
     * @returns {Option<T>} If this `Option` is `Some`, returns this `Some`. Otherwise, returns `other`.
     * @description Returns the `Option` if it is `Some`, otherwise returns `other`.
     */
    public or(other: Option<T>): Option<T> {
        if (isSome(this.value)) {
            return this;
        }
        return other;
    }

    /**
     * @method xor
     * @param {Option<T>} other Another `Option` to combine with.
     * @returns {Option<T>} Returns `Some` if exactly one of the `Option`s is `Some`, otherwise returns `None`.
     * @description Returns `Some` if exactly one of `this` or `other` is `Some`, otherwise returns `None`.
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
     * @method take
     * @returns {Option<T>} An `Option` containing the value that was in `this`, and sets `this` to `None`.
     * @description Takes the value out of the `Option`, leaving a `None` in its place.
     */
    public take(): Option<T> {
        const option = new Option(this.value);
        this.value = undefined;
        return option;
    }

    /**
     * @method okOr
     * @template U The type of the error value for the `Result`.
     * @param {U} error The error value to use if the `Option` is `None`.
     * @returns {Result<T, U>} A `Result` containing the `Some` value if present, otherwise an `Err` with the provided error.
     * @description Converts the `Option` into a `Result`, mapping `Some(v)` to `Ok(v)`
     * and `None` to `Err(error)`.
     */
    public okOr<U>(error: U): Result<T, U> {
        const value = this.value;
        if (isSome(value)) {
            return new Result({ value });
        } else {
            return new Result({ error });
        }
    }

    /**
     * @method okOrElse
     * @template U The type of the error value for the `Result`.
     * @param {() => U} func A function that produces an error value if the `Option` is `None`.
     * @returns {Result<T, U>} A `Result` containing the `Some` value if present, otherwise an `Err` with the result of `func`.
     * @description Converts the `Option` into a `Result`, mapping `Some(v)` to `Ok(v)`
     * and `None` to `Err(func())`.
     */
    public okOrElse<U>(func: () => U): Result<T, U> {
        const value = this.value;
        if (isSome(value)) {
            return new Result({ value });
        } else {
            const error = func();
            return new Result({ error });
        }
    }

}

/**
 * @function Some
 * @template T The type of the value.
 * @param {T} value The value to wrap in an `Option`.
 * @returns {Option<T>} A new `Option` instance representing a present value.
 * @description Creates a new `Option` instance containing a value.
 */
export const Some = <T>(value: T): Option<T> => new Option<T>(value);

/**
 * @function None
 * @template T The type of the value (implicitly undefined).
 * @returns {Option<T>} A new `Option` instance representing the absence of a value.
 * @description Creates a new `Option` instance indicating no value is present.
 */
export const None = <T>(): Option<T> => new Option<T>();

/**
 * @template T The type of the value in the `Option`.
 * @template R The return type of the match.
 * @property {(value: T) => R} Some Function to execute if the `Option` is `Some`.
 * @property {() => R} None Function to execute if the `Option` is `None`.
 * @description Defines the structure for a matcher object used with `Option` types.
 */
export type OptionMatcher<T, R> = {
    Some: (value: T) => R;
    None: () => R;
};

/**
 * @template T The type of the successful value in the `Result`.
 * @template E The type of the error value in the `Result`.
 * @template R The return type of the match.
 * @property {(value: T) => R} Ok Function to execute if the `Result` is `Ok`.
 * @property {(err: E) => R} Err Function to execute if the `Result` is `Err`.
 * @description Defines the structure for a matcher object used with `Result` types.
 */
export type ResultMatcher<T, E, R> = {
    Ok: (value: T) => R;
    Err: (err: E) => R;
};

/**
 * @function isOptionMatch
 * @template T
 * @template E
 * @param {Option<T> | Result<T, E>} o The input to check.
 * @returns {boolean} True if the input is an `Option` instance, false otherwise.
 * @description Type guard to check if an input is an instance of `Option`.
 */
const isOptionMatch = <T, E>(o: Option<T> | Result<T, E>): o is Option<T> => o instanceof Option;
/**
 * @function isResultMatch
 * @template T
 * @template E
 * @param {Option<T> | Result<T, E>} o The input to check.
 * @returns {boolean} True if the input is a `Result` instance, false otherwise.
 * @description Type guard to check if an input is an instance of `Result`.
 */
const isResultMatch = <T, E>(o: Option<T> | Result<T, E>): o is Result<T, E> => o instanceof Result;

/**
 * @function isOptionMatcher
 * @template T
 * @template E
 * @template R
 * @param {OptionMatcher<T, R> | ResultMatcher<T, E, R>} m The matcher to check.
 * @returns {boolean} True if the matcher is an `OptionMatcher`, false otherwise.
 * @description Type guard to check if a matcher object is an `OptionMatcher`.
 */
const isOptionMatcher = <T, E, R>(m: OptionMatcher<T, R> | ResultMatcher<T, E, R>): m is OptionMatcher<T, R> => "Some" in m && "None" in m;
/**
 * @function isResultMatcher
 * @template T
 * @template E
 * @template R
 * @param {OptionMatcher<T, R> | ResultMatcher<T, E, R>} m The matcher to check.
 * @returns {boolean} True if the matcher is a `ResultMatcher`, false otherwise.
 * @description Type guard to check if a matcher object is a `ResultMatcher`.
 */
const isResultMatcher = <T, E, R>(m: OptionMatcher<T, R> | ResultMatcher<T, E, R>): m is ResultMatcher<T, E, R> => "Ok" in m && "Err" in m;


/**
 * @function match
 * @template T The type of the value in the `Option`.
 * @template R The return type of the match.
 * @param {Option<T>} input The `Option` to match against.
 * @param {OptionMatcher<T, R>} matcher The matcher object with `Some` and `None` functions.
 * @returns {R} The result of the matched function.
 * @throws {Error} If the input type does not align with the provided matcher.
 * @description Overload for matching `Option` types.
 */
export function match<T, R>(input: Option<T>, matcher: OptionMatcher<T, R>): R;
/**
 * @function match
 * @template T The type of the successful value in the `Result`.
 * @template E The type of the error value in the `Result`.
 * @template R The return type of the match.
 * @param {Result<T, E>} input The `Result` to match against.
 * @param {ResultMatcher<T, E, R>} matcher The matcher object with `Ok` and `Err` functions.
 * @returns {R} The result of the matched function.
 * @throws {Error} If the input type does not align with the provided matcher.
 * @description Overload for matching `Result` types.
 */
export function match<T, E, R>(input: Result<T, E>, matcher: ResultMatcher<T, E, R>): R;
/**
 * @function match
 * @template T The type of the value (for Option) or successful value (for Result).
 * @template E The type of the error value (for Result).
 * @template R The return type of the match.
 * @param {Option<T> | Result<T, E>} input The `Option` or `Result` to match against.
 * @param {OptionMatcher<T, R> | ResultMatcher<T, E, R>} matcher The matcher object with appropriate functions (`Some`/`None` or `Ok`/`Err`).
 * @returns {R} The result of the matched function.
 * @throws {Error} If the input type does not align with the provided matcher, or a required handler function is missing.
 * @description Provides a pattern matching mechanism for `Option` and `Result` types.
 * It allows you to explicitly handle `Some`/`None` or `Ok`/`Err` cases
 * in a clear and type-safe manner.
 */
export function match<T, E, R>(input: Option<T> | Result<T, E>, matcher: OptionMatcher<T, R> | ResultMatcher<T, E, R>): R {

    if (isOptionMatch(input) && isOptionMatcher(matcher)) {
        const { Some, None } = matcher;
        if (input.isSome()) {
            return Some(input.unwrap());
        }
        return None();
    }

    if (isResultMatch(input) && isResultMatcher(matcher)) {
        const { Ok, Err } = matcher;
        if (input.isOk()) {
            return Ok(input.unwrap());
        }
        return Err(input.unwrapErr());
    }

    throw new Error('MatchError: Input value type does not align with the provided handler, or a required handler function (e.g., Some, None, Ok, Err) is missing.');
}