export type GoifyResult<T, E = Error> = [T, null] | [null, E];

/**
 * Executes an asynchronous or synchronous operation and returns its result or any caught error.
 * This function mimics Go-style error handling, returning a tuple where the first element
 * is the successful result and the second element is an error object if the operation fails.
 *
 * @template T The expected type of the successful result from the operation.
 * @template E The expected type of the error that might be caught. Defaults to `Error`.
 * @param {function(): Promise<T>} operation The asynchronous function to be executed.
 * @returns {Promise<GoifyResult<T, E>>} A promise that resolves to an GoifyResult tuple.
 * If the operation succeeds, the first element is the result and the second is null.
 * If the operation fails, the first element is null and the second is an Error object.
 */
export function goify<T, E = Error>(operation: () => Promise<T>): Promise<GoifyResult<T, E>>;
/**
 * Executes a synchronous operation and returns its result or any caught error.
 * This function mimics Go-style error handling for synchronous code, returning a tuple where the first element
 * is the successful result and the second element is an error object if the operation fails.
 *
 * @template T The expected type of the successful result from the operation.
 * @template E The expected type of the error that might be caught. Defaults to `Error`.
 * @param {function(): T} operation The synchronous function to be executed.
 * @returns {GoifyResult<T, E>} A `GoifyResult` tuple.
 * If the operation succeeds, the first element is the result and the second is `null`.
 * If the operation fails, the first element is `null` and the second is an `Error` object.
 */
export function goify<T, E = Error>(operation: () => T): GoifyResult<T, E>;
export function goify<T, E = Error>(
    operation: (() => Promise<T>) | (() => T)
): GoifyResult<T, E> | Promise<GoifyResult<T, E>> {
    try {
        const result = operation();

        if (result instanceof Promise) {
            return result
                .then((data) => [data, null] as GoifyResult<T, E>)
                .catch((caughtError: unknown) => [null, caughtError as E]);
        } else {
            return [result, null] as GoifyResult<T, E>;
        }
    } catch (caughtError: unknown) {
        return [null, caughtError as E];
    }
};