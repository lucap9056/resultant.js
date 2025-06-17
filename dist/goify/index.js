"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.goifySync = exports.goify = void 0;
/**
 * Executes an asynchronous operation and returns its result or any caught error.
 * This function mimics the Go-style error handling, returning a tuple where the first element
 * is the successful result and the second element is an error object if the operation fails.
 *
 * @template T The expected type of the successful result from the operation.
 * @param {function(): Promise<T>} operation The asynchronous function to be executed.
 * @returns {Promise<GoifyResult<T, E>>} A promise that resolves to an GoifyResult tuple.
 * If the operation succeeds, the first element is the result and the second is null.
 * If the operation fails, the first element is null and the second is an Error object.
 */
const goify = async (operation) => {
    try {
        const result = await operation();
        return [result, null];
    }
    catch (caughtError) {
        return [null, caughtError];
    }
};
exports.goify = goify;
/**
 * Executes a synchronous operation and returns its result or any caught error.
 * This function mimics the Go-style error handling for synchronous code, returning a tuple where the first element
 * is the successful result and the second element is an error object if the operation fails.
 *
 * @template T The expected type of the successful result from the operation.
 * @template E The expected type of the error that might be caught. Defaults to `Error`.
 * @param {function(): T} syncOperation The synchronous function to be executed.
 * @returns {GoifyResult<T, E>} A `GoifyResult` tuple.
 * If the operation succeeds, the first element is the result and the second is `null`.
 * If the operation fails, the first element is `null` and the second is an `Error` object.
 */
const goifySync = (syncOperation) => {
    try {
        const result = syncOperation();
        return [result, null];
    }
    catch (caughtError) {
        return [null, caughtError];
    }
};
exports.goifySync = goifySync;
