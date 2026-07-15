/**
 * `Result`/`Option` types modeled after Rust's, for explicit error handling,
 * avoiding unexpected `null`/`undefined` and unhandled exceptions.
 *
 * @example
 * import { Ok, Err, match } from 'resultant.js/rustify';
 *
 * const divide = (a: number, b: number) =>
 *     b === 0 ? Err<number, string>('divide by zero') : Ok<number, string>(a / b);
 *
 * match(divide(10, 2), { 
 *   Ok: (v) => console.log(v), 
 *   Err: (e) => console.error(e) 
 * }); // 5
 */
type OutcomeOk<VALUE> = { value: VALUE };
type OutcomeErr<ERROR> = { error: ERROR };

/**
 * Outcome with a boolean `ok` flag and a stringified error, for serialization (e.g. API responses).
 * @example
 * const outcome: SerializableOutcome<number> = { value: 42, ok: true };
 */
export type SerializableOutcome<VALUE> = (OutcomeOk<VALUE> | OutcomeErr<string>) & { ok: boolean };

/**
 * Success (`OutcomeOk<VALUE>`) or failure (`OutcomeErr<ERROR>`) — the shape backing `Result`.
 * @example
 * const outcome: Outcome<number, string> = { value: 42 };
 */
export type Outcome<VALUE, ERROR> = OutcomeOk<VALUE> | OutcomeErr<ERROR>;

/** Normalizes an unknown thrown value into a string message. */
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

/** Normalizes an unknown thrown/rejected value into an `Error`, preserving it as-is when it already is one. */
function convertErrorToError(err: unknown): Error {
    if (err instanceof Error) {
        return err;
    }
    return new Error(convertErrorToString(err));
};

/**
 * Runs `operation` (sync or async) and wraps the outcome as a `SerializableOutcome`, catching thrown/rejected errors into a string `error`.
 * @example
 * buildSerializableOutcome(() => 42); // { value: 42, ok: true }
 * buildSerializableOutcome(() => { throw new Error('boom'); }); // { error: 'boom', ok: false }
 */
export function buildSerializableOutcome<VALUE>(operation: () => VALUE): SerializableOutcome<VALUE>;
/** @deprecated Use `buildSerializableOutcomeAsync` for async operations instead. */
export function buildSerializableOutcome<VALUE>(operation: () => Promise<VALUE>): Promise<SerializableOutcome<VALUE>>;
export function buildSerializableOutcome<VALUE>(operation: () => Promise<VALUE> | VALUE): Promise<SerializableOutcome<VALUE>> | SerializableOutcome<VALUE> {
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
 * Async-only counterpart of `buildSerializableOutcome`.
 * @example
 * await buildSerializableOutcomeAsync(async () => 42); // { value: 42, ok: true }
 */
export async function buildSerializableOutcomeAsync<VALUE>(operation: () => Promise<VALUE>): Promise<SerializableOutcome<VALUE>> {
    try {
        const result = operation();
        return result.then((value) => ({ value, ok: true })).catch((err) => ({ error: convertErrorToString(err), ok: false }));
    } catch (err) {
        const error = convertErrorToString(err);
        return Promise.resolve({ error, ok: false });
    }
};

/**
 * Runs `operation` (sync or async) and wraps the outcome as a `Result`, catching thrown/rejected errors into `Err`.
 * A thrown/rejected value that isn't already an `Error` is normalized into one (preserving the original when it is).
 * @example
 * buildResult(() => 42); // Ok(42)
 * buildResult(() => { throw new Error('boom'); }); // Err(Error('boom'))
 * buildResult(() => { throw 'boom'; }); // Err(Error('boom')) — normalized, not the raw string
 */
export function buildResult<OK, ERR = Error>(operation: () => OK): Result<OK, ERR>;
/** @deprecated Use `buildResultAsync` for async operations instead. */
export function buildResult<OK, ERR = Error>(operation: () => Promise<OK>): Promise<Result<OK, ERR>>;
export function buildResult<OK, ERR = Error>(operation: () => Promise<OK> | OK): Promise<Result<OK, ERR>> | Result<OK, ERR> {
    try {
        const result = operation();
        if (result instanceof Promise) {
            return result.then(value => Ok<OK, ERR>(value)).catch((err) => Err<OK, ERR>(convertErrorToError(err) as ERR));
        }
        return Ok<OK, ERR>(result);
    }
    catch (err) {
        return Err<OK, ERR>(convertErrorToError(err) as ERR);
    }
};

/**
 * Async-only counterpart of `buildResult`. Same `Error` normalization applies to thrown/rejected values.
 * @example
 * await buildResultAsync(async () => fetchUser(id)); // Ok(user) or Err(error)
 */
export async function buildResultAsync<OK, ERR = Error>(operation: () => Promise<OK>): Promise<Result<OK, ERR>> {
    try {
        const result = operation();
        return result.then(value => Ok<OK, ERR>(value)).catch((err) => Err<OK, ERR>(convertErrorToError(err) as ERR));
    }
    catch (err) {
        return Promise.resolve(Err<OK, ERR>(convertErrorToError(err) as ERR));
    }
};

const isOk = <VALUE, ERROR>(outcome: Outcome<VALUE, ERROR> | SerializableOutcome<VALUE>): outcome is OutcomeOk<VALUE> => 'value' in outcome || ('ok' in outcome && outcome.ok === true);
const isErr = <VALUE, ERROR>(outcome: Outcome<VALUE, ERROR> | SerializableOutcome<VALUE>): outcome is OutcomeErr<ERROR> => 'error' in outcome || ('ok' in outcome && outcome.ok === false);

/**
 * Creates a successful `Result`.
 * @example
 * Ok(42); // Result<number, never>
 */
export const Ok = <OK, ERR>(value: OK): Result<OK, ERR> => new Result<OK, ERR>({ value });
/**
 * Creates a failed `Result`.
 * @example
 * Err('not found'); // Result<never, string>
 */
export const Err = <OK, ERR>(error: ERR): Result<OK, ERR> => new Result<OK, ERR>({ error });

/**
 * Either a success (`Ok`) holding an `OK`, or a failure (`Err`) holding an `ERR`.
 * @example
 * const result: Result<number, string> = Ok(42);
 * result.isOk(); // true
 */
export class Result<OK, ERR> {
    /**
     * Converts a `SerializableOutcome` (or a Promise of one) into a `Result`, wrapping string errors in `Error`.
     * @example
     * Result.From({ value: 42, ok: true }); // Ok(42)
     * Result.From({ error: 'boom', ok: false }); // Err(Error('boom'))
     */
    public static From<OK>(input: SerializableOutcome<OK>): Result<OK, Error>;
    /** @deprecated Use `Result.FromAsync` for a Promise input instead. */
    public static From<OK>(input: Promise<SerializableOutcome<OK>>): Promise<Result<OK, Error>>;
    public static From<OK>(input: SerializableOutcome<OK> | Promise<SerializableOutcome<OK>>): Result<OK, Error> | Promise<Result<OK, Error>> {
        if (input instanceof Promise) {
            return input.then(result => {

                if (isOk(result)) {
                    return Ok<OK, Error>(result.value);
                } else {
                    return Err<OK, Error>(new Error(result.error));
                }
            }).catch(err => Err<OK, Error>(new Error(convertErrorToString(err))));
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

    /**
     * Async-only counterpart of `Result.From`.
     * @example
     * await Result.FromAsync(fetchSerializableOutcome()); // Ok(...) or Err(Error(...))
     */
    public static async FromAsync<OK>(input: Promise<SerializableOutcome<OK>>): Promise<Result<OK, Error>> {
        return input.then(result => {
            if (isOk(result)) {
                return Ok<OK, Error>(result.value);
            } else {
                return Err<OK, Error>(new Error(result.error));
            }
        }).catch(err => Err<OK, Error>(new Error(convertErrorToString(err))));
    }

    private outcome: Outcome<OK, ERR>;

    /** Prefer `Ok()`/`Err()` over calling this directly. */
    constructor(outcome: Outcome<OK, ERR>) {
        this.outcome = outcome;
    }

    /**
     * Checks whether the `Result` is `Ok`, narrowing its type.
     * @example
     * Ok(1).isOk(); // true
     */
    public isOk(): this is Result<OK, never> {
        return isOk(this.outcome);
    }

    /**
     * Checks whether the `Result` is `Err`, narrowing its type.
     * @example
     * Err('x').isErr(); // true
     */
    public isErr(): this is Result<never, ERR> {
        return isErr(this.outcome);
    }

    /**
     * Checks whether the `Result` is `Ok` and its value satisfies `func`.
     * @example
     * Ok(4).isOkAnd(v => v % 2 === 0); // true
     */
    public isOkAnd(func: (value: OK) => boolean): boolean {
        if (isOk(this.outcome)) {
            return func(this.outcome.value);
        }
        return false;
    }

    /**
     * Checks whether the `Result` is `Err` and its error satisfies `func` (sync or async).
     * @example
     * Err('boom').isErrAnd(e => e === 'boom'); // true
     */
    public isErrAnd(func: (error: ERR) => boolean): boolean
    /** @deprecated Use `isErrAndAsync` for an async predicate instead. */
    public isErrAnd(func: (error: ERR) => Promise<boolean>): Promise<boolean>
    public isErrAnd(func: (error: ERR) => boolean | Promise<boolean>): boolean | Promise<boolean> {
        if (isErr(this.outcome)) {
            return func(this.outcome.error);
        }
        return false;
    }

    /**
     * Async-only counterpart of `isErrAnd`.
     * @example
     * await Err('boom').isErrAndAsync(async (e) => e === 'boom'); // true
     */
    public isErrAndAsync(func: (error: ERR) => Promise<boolean>): Promise<boolean> {
        if (isErr(this.outcome)) {
            return func(this.outcome.error);
        }
        return Promise.resolve(false);
    }

    /**
     * Returns the `Ok` value, or throws if `Err`.
     * @example
     * Ok(42).unwrap(); // 42
     */
    public unwrap(): OK {
        if (isOk(this.outcome)) {
            return this.outcome.value;
        }
        throw new Error(
            `Attempted to unwrap an 'Err' result: ${this.outcome.error}`
        );
    }

    /**
     * Returns the `Ok` value, or throws `message` if `Err`.
     * @example
     * Ok(42).expect('should have a value'); // 42
     */
    public expect(message: string): OK {
        if (isOk(this.outcome)) {
            return this.outcome.value;
        }
        throw new Error(message);
    }

    /**
     * Returns the `Ok` value, or `defaultValue` if `Err`.
     * @example
     * Err('boom').unwrapOr(0); // 0
     */
    public unwrapOr(defaultValue: OK): OK {
        if (isOk(this.outcome)) {
            return this.outcome.value;
        }
        return defaultValue;
    }

    /**
     * Returns the `Ok` value, or computes one from `onErrorFunc` (sync or async) if `Err`.
     * @example
     * Err('boom').unwrapOrElse(() => 0); // 0
     */
    public unwrapOrElse(onErrorFunc: (error: ERR) => OK): OK
    /** @deprecated Use `unwrapOrElseAsync` for an async fallback instead. */
    public unwrapOrElse(onErrorFunc: (error: ERR) => Promise<OK>): Promise<OK>
    public unwrapOrElse(onErrorFunc: (error: ERR) => OK | Promise<OK>): OK | Promise<OK> {
        if (isOk(this.outcome)) {
            return this.outcome.value;
        }
        return onErrorFunc(this.outcome.error);
    }

    /**
     * Async-only counterpart of `unwrapOrElse`.
     * @example
     * await Err('boom').unwrapOrElseAsync(async () => 0); // 0
     */
    public unwrapOrElseAsync(onErrorFunc: (error: ERR) => Promise<OK>): Promise<OK> {
        if (isOk(this.outcome)) {
            return Promise.resolve(this.outcome.value);
        }
        return onErrorFunc(this.outcome.error);
    }

    /**
     * Returns the `Err` value, or throws if `Ok`.
     * @example
     * Err('boom').unwrapErr(); // 'boom'
     */
    public unwrapErr(): ERR {
        if (isErr(this.outcome)) {
            return this.outcome.error;
        }
        throw new Error('Attempted to unwrap `Err` from an `Ok` result.');
    }

    /**
     * Returns the `Err` value, or throws `message` if `Ok`.
     * @example
     * Err('boom').expectErr('should have failed'); // 'boom'
     */
    public expectErr(message: string): ERR {
        if (isErr(this.outcome)) {
            return this.outcome.error;
        }
        throw new Error(message);
    }

    /**
     * Transforms the `Ok` value with `transform` (sync or async), leaving `Err` untouched.
     * @example
     * Ok(2).map(v => v * 2); // Ok(4)
     */
    public map<VALUE>(transform: (value: OK) => VALUE): Result<VALUE, ERR>
    /** @deprecated Use `mapAsync` for an async transform instead. */
    public map<VALUE>(transform: (value: OK) => Promise<VALUE>): Promise<Result<VALUE, ERR>>
    public map<VALUE>(transform: (value: OK) => VALUE | Promise<VALUE>): Result<VALUE, ERR> | Promise<Result<VALUE, ERR>> {
        if (isOk(this.outcome)) {
            const result = transform(this.outcome.value);
            if (result instanceof Promise) {
                return result.then(value => Ok(value));
            }
            return Ok(result);
        }
        return new Result<VALUE, ERR>(this.outcome as OutcomeErr<ERR>);
    }

    /**
     * Async-only counterpart of `map`.
     * @example
     * await Ok(2).mapAsync(async (v) => v * 2); // Ok(4)
     */
    public async mapAsync<VALUE>(transform: (value: OK) => Promise<VALUE>): Promise<Result<VALUE, ERR>> {
        if (isOk(this.outcome)) {
            const result = transform(this.outcome.value);
            return result.then(value => Ok(value));
        }
        return Promise.resolve(new Result<VALUE, ERR>(this.outcome as OutcomeErr<ERR>));
    }

    /**
     * Transforms the `Err` value with `transform` (sync or async), leaving `Ok` untouched.
     * @example
     * Err('boom').mapErr(e => new Error(e)); // Err(Error('boom'))
     */
    public mapErr<ERROR>(transform: (error: ERR) => ERROR): Result<OK, ERROR>
    /** @deprecated Use `mapErrAsync` for an async transform instead. */
    public mapErr<ERROR>(transform: (error: ERR) => Promise<ERROR>): Promise<Result<OK, ERROR>>
    public mapErr<ERROR>(transform: (error: ERR) => ERROR | Promise<ERROR>): Result<OK, ERROR> | Promise<Result<OK, ERROR>> {
        if (isErr(this.outcome)) {
            const result = transform(this.outcome.error);
            if (result instanceof Promise) {
                return result.then((error) => Err(error));
            }
            return Err(result);
        }
        return Ok(this.outcome.value as OK) as Result<OK, ERROR>;
    }

    /**
     * Async-only counterpart of `mapErr`.
     * @example
     * await Err('boom').mapErrAsync(async (e) => new Error(e)); // Err(Error('boom'))
     */
    public async mapErrAsync<ERROR>(transform: (error: ERR) => Promise<ERROR>): Promise<Result<OK, ERROR>> {
        if (isErr(this.outcome)) {
            const result = transform(this.outcome.error);
            return result.then((error) => Err(error));
        }
        return Promise.resolve(Ok(this.outcome.value as OK) as Result<OK, ERROR>);
    }

    /**
     * Returns `otherResult` if this is `Ok`, otherwise this `Err`.
     * @example
     * Ok(1).and(Ok(2)); // Ok(2)
     */
    public and(otherResult: Result<OK, ERR>): Result<OK, ERR> {
        if (isOk(this.outcome)) {
            return otherResult;
        }
        return Err(this.outcome.error);
    }

    /**
     * Chains a `Result`-returning `transform` (sync or async) onto an `Ok` value; short-circuits on `Err`.
     * @example
     * Ok(2).andThen(v => Ok(v * 2)); // Ok(4)
     */
    public andThen<VALUE>(transform: (value: OK) => Result<VALUE, ERR>): Result<VALUE, ERR>;
    /** @deprecated Use `andThenAsync` for an async transform instead. */
    public andThen<VALUE>(transform: (value: OK) => Promise<Result<VALUE, ERR>>): Promise<Result<VALUE, ERR>>;
    public andThen<VALUE>(transform: (value: OK) => Result<VALUE, ERR> | Promise<Result<VALUE, ERR>>): Result<VALUE, ERR> | Promise<Result<VALUE, ERR>> {
        if (isOk(this.outcome)) {
            return transform(this.outcome.value);
        }
        return Err(this.outcome.error);
    }

    /**
     * Async-only counterpart of `andThen`.
     * @example
     * await Ok(2).andThenAsync(async (v) => Ok(v * 2)); // Ok(4)
     */
    public andThenAsync<VALUE>(transform: (value: OK) => Promise<Result<VALUE, ERR>>): Promise<Result<VALUE, ERR>> {
        if (isOk(this.outcome)) {
            return transform(this.outcome.value);
        }
        return Promise.resolve(Err(this.outcome.error));
    }

    /**
     * Returns this if `Ok`, otherwise `otherResult`.
     * @example
     * Err('boom').or(Ok(1)); // Ok(1)
     */
    public or(otherResult: Result<OK, ERR>): Result<OK, ERR> {
        if (isOk(this.outcome)) {
            return Ok(this.outcome.value);
        }
        return otherResult;
    }

    /**
     * Returns this if `Ok`, otherwise computes a fallback `Result` from `onErrorFunc` (sync or async).
     * @example
     * Err('boom').orElse(() => Ok(1)); // Ok(1)
     */
    public orElse(onErrorFunc: (error: ERR) => Result<OK, ERR>): Result<OK, ERR>
    /** @deprecated Use `orElseAsync` for an async fallback instead. */
    public orElse(onErrorFunc: (error: ERR) => Promise<Result<OK, ERR>>): Promise<Result<OK, ERR>>
    public orElse(onErrorFunc: (error: ERR) => Result<OK, ERR> | Promise<Result<OK, ERR>>): Result<OK, ERR> | Promise<Result<OK, ERR>> {
        if (isOk(this.outcome)) {
            return Ok(this.outcome.value);
        }
        return onErrorFunc(this.outcome.error);
    }

    /**
     * Async-only counterpart of `orElse`.
     * @example
     * await Err('boom').orElseAsync(async () => Ok(1)); // Ok(1)
     */
    public orElseAsync(onErrorFunc: (error: ERR) => Promise<Result<OK, ERR>>): Promise<Result<OK, ERR>> {
        if (isOk(this.outcome)) {
            return Promise.resolve(Ok(this.outcome.value));
        }
        return onErrorFunc(this.outcome.error);
    }
}

const isNone = <SOME>(value?: SOME): value is undefined => value === undefined;
const isSome = <SOME>(value?: SOME): value is SOME => value !== undefined;

/**
 * Either a present value (`Some`) or absence of one (`None`), in place of `null`/`undefined`.
 * @example
 * const option: Option<number> = Some(42);
 * option.isSome(); // true
 */
export class Option<SOME> {

    /**
     * Converts a nullable/void value (or a Promise of one) into an `Option`, wrapped in a `Result`.
     * @example
     * Option.From(42); // Ok(Some(42))
     * Option.From(null); // Ok(None())
     */
    public static From<SOME>(input?: SOME | null | void | undefined): Result<Option<SOME>, never>;
    /** @deprecated Use `Option.FromAsync` for a Promise input instead. */
    public static From<SOME, ERROR>(input: Promise<SOME | null | void | undefined>): Promise<Result<Option<SOME>, ERROR>>;
    public static From<SOME, ERROR>(input?: (SOME | null | void | undefined) | Promise<SOME | null | void | undefined>): Result<Option<SOME>, never> | Promise<Result<Option<SOME>, ERROR>> {
        if (input instanceof Promise) {
            return input
                .then(result => Ok<Option<SOME>, ERROR>(new Option(result)))
                .catch((err: ERROR) => Err<Option<SOME>, ERROR>(err));
        } else {
            return Ok(new Option(input));
        }
    }

    /**
     * Async-only counterpart of `Option.From`.
     * @example
     * await Option.FromAsync(fetchNullableValue()); // Ok(Some(...)) or Err(...)
     */
    public static async FromAsync<SOME, ERROR>(input: Promise<SOME | null | void | undefined>): Promise<Result<Option<SOME>, ERROR>> {
        return input
            .then(result => Ok<Option<SOME>, ERROR>(new Option(result)))
            .catch((err: ERROR) => Err<Option<SOME>, ERROR>(err));
    }

    private value?: SOME;

    /** Prefer `Some()`/`None()` over calling this directly. */
    constructor(value?: SOME | null | void) {
        if (value !== undefined && value !== null) {
            this.value = value;
        }
    }

    /**
     * Checks whether the `Option` holds a value.
     * @example
     * Some(1).isSome(); // true
     */
    public isSome(): boolean {
        return isSome(this.value);
    }

    /**
     * Checks whether the `Option` is empty.
     * @example
     * None().isNone(); // true
     */
    public isNone(): boolean {
        return isNone(this.value);
    }

    /**
     * Checks whether the `Option` is `Some` and its value satisfies `func` (sync or async).
     * @example
     * Some(4).isSomeAnd(v => v % 2 === 0); // true
     */
    public isSomeAnd(func: (value: SOME) => boolean): boolean
    /** @deprecated Use `isSomeAndAsync` for an async predicate instead. */
    public isSomeAnd(func: (value: SOME) => Promise<boolean>): Promise<boolean>
    public isSomeAnd(func: (value: SOME) => boolean | Promise<boolean>): boolean | Promise<boolean> {
        if (isSome(this.value)) {
            return func(this.value);
        }
        return false;
    }

    /**
     * Async-only counterpart of `isSomeAnd`.
     * @example
     * await Some(4).isSomeAndAsync(async (v) => v % 2 === 0); // true
     */
    public isSomeAndAsync(func: (value: SOME) => Promise<boolean>): Promise<boolean> {
        if (isSome(this.value)) {
            return func(this.value);
        }
        return Promise.resolve(false);
    }

    /**
     * Returns the `Some` value, or throws if `None`.
     * @example
     * Some(42).unwrap(); // 42
     */
    public unwrap(): SOME {
        if (isSome(this.value)) {
            return this.value;
        }
        throw new Error("Attempted to unwrap a 'None' Option. No value is present.");
    }

    /**
     * Returns the `Some` value, or throws `message` if `None`.
     * @example
     * Some(42).expect('should have a value'); // 42
     */
    public expect(message: string): SOME {
        if (isSome(this.value)) {
            return this.value;
        }
        throw new Error(message);
    }

    /**
     * Returns the `Some` value, or `_default` if `None`.
     * @example
     * None<number>().unwrapOr(0); // 0
     */
    public unwrapOr(_default: SOME): SOME {
        if (isSome(this.value)) {
            return this.value;
        }
        return _default;
    }

    /**
     * Returns the `Some` value, or computes one from `func` (sync or async) if `None`.
     * @example
     * None<number>().unwrapOrElse(() => 0); // 0
     */
    public unwrapOrElse(func: () => SOME): SOME
    /** @deprecated Use `unwrapOrElseAsync` for an async fallback instead. */
    public unwrapOrElse(func: () => Promise<SOME>): Promise<SOME>
    public unwrapOrElse(func: () => SOME | Promise<SOME>): SOME | Promise<SOME> {
        if (isSome(this.value)) {
            return this.value;
        }
        return func();
    }

    /**
     * Async-only counterpart of `unwrapOrElse`.
     * @example
     * await None<number>().unwrapOrElseAsync(async () => 0); // 0
     */
    public unwrapOrElseAsync(func: () => Promise<SOME>): Promise<SOME> {
        if (isSome(this.value)) {
            return Promise.resolve(this.value);
        }
        return func();
    }

    /**
     * Transforms the `Some` value with `func` (sync or async), leaving `None` untouched.
     * @example
     * Some(2).map(v => v * 2); // Some(4)
     */
    public map<VALUE>(func: (value: SOME) => VALUE): Option<VALUE>
    /** @deprecated Use `mapAsync` for an async transform instead. */
    public map<VALUE>(func: (value: SOME) => Promise<VALUE>): Promise<Option<VALUE>>
    public map<VALUE>(func: (value: SOME) => VALUE | Promise<VALUE>): Option<VALUE> | Promise<Option<VALUE>> {
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
     * Async-only counterpart of `map`.
     * @example
     * await Some(2).mapAsync(async (v) => v * 2); // Some(4)
     */
    public async mapAsync<VALUE>(func: (value: SOME) => Promise<VALUE>): Promise<Option<VALUE>> {
        if (isSome(this.value)) {
            const result = func(this.value);
            return result.then((res) => new Option(res));
        }
        return Promise.resolve(None());
    }

    /**
     * Chains an `Option`-returning `transform` (sync or async) onto a `Some` value; short-circuits on `None`.
     * @example
     * Some(2).andThen(v => Some(v * 2)); // Some(4)
     */
    public andThen<VALUE>(transform: (value: SOME) => Option<VALUE>): Option<VALUE>;
    /** @deprecated Use `andThenAsync` for an async transform instead. */
    public andThen<VALUE>(transform: (value: SOME) => Promise<Option<VALUE>>): Promise<Option<VALUE>>;
    public andThen<VALUE>(transform: (value: SOME) => Option<VALUE> | Promise<Option<VALUE>>): Option<VALUE> | Promise<Option<VALUE>> {
        if (isSome(this.value)) {
            return transform(this.value);
        }
        return None();
    }

    /**
     * Async-only counterpart of `andThen`.
     * @example
     * await Some(2).andThenAsync(async (v) => Some(v * 2)); // Some(4)
     */
    public andThenAsync<VALUE>(transform: (value: SOME) => Promise<Option<VALUE>>): Promise<Option<VALUE>> {
        if (isSome(this.value)) {
            return transform(this.value);
        }
        return Promise.resolve(None());
    }

    /**
     * Returns `other` if this is `Some`, otherwise `None`.
     * @example
     * Some(1).and(Some('a')); // Some('a')
     */
    public and<VALUE>(other: Option<VALUE>): Option<VALUE> {
        if (isSome(this.value)) {
            return other;
        }
        return new Option<VALUE>(undefined);
    }

    /**
     * Returns this if `Some`, otherwise `other`.
     * @example
     * None<number>().or(Some(1)); // Some(1)
     */
    public or(other: Option<SOME>): Option<SOME> {
        if (isSome(this.value)) {
            return this;
        }
        return other;
    }

    /**
     * `Some` if exactly one of `this`/`other` is `Some`, otherwise `None`.
     * @example
     * Some(1).xor(None()); // Some(1)
     */
    public xor(other: Option<SOME>): Option<SOME> {
        const some = isSome(this.value);
        if (some === other.isSome()) {
            return new Option<SOME>(undefined);
        }
        if (some) {
            return this;
        }
        return other;
    }

    /**
     * Extracts the value, leaving `None` in its place.
     * @example
     * const option = Some(1);
     * option.take(); // Some(1); option is now None()
     */
    public take(): Option<SOME> {
        const option = new Option(this.value);
        this.value = undefined;
        return option;
    }

    /**
     * Converts to a `Result`: `Some(v)` → `Ok(v)`, `None` → `Err(error)`.
     * @example
     * None<number>().okOr('missing'); // Err('missing')
     */
    public okOr<ERROR>(error: ERROR): Result<SOME, ERROR> {
        const value = this.value;
        if (isSome(value)) {
            return new Result({ value });
        } else {
            return new Result({ error });
        }
    }

    /**
     * Converts to a `Result`: `Some(v)` → `Ok(v)`, `None` → `Err(func())`.
     * @example
     * None<number>().okOrElse(() => 'missing'); // Err('missing')
     */
    public okOrElse<ERROR>(func: () => ERROR): Result<SOME, ERROR> {
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
 * Creates a `Some` `Option`.
 * @example
 * Some(42); // Option<number>
 */
export const Some = <SOME>(value: SOME): Option<SOME> => new Option<SOME>(value);

/**
 * Creates a `None` `Option`.
 * @example
 * None<number>(); // Option<number> with no value
 */
export const None = <SOME>(): Option<SOME> => new Option<SOME>();

/** Handlers for `match()` against an `Option`. */
export type OptionMatcher<SOME, VALUE> = {
    Some: (value: SOME) => VALUE;
    None: () => VALUE;
};

/** Handlers for `match()` against a `Result`. */
export type ResultMatcher<OK, ERR, VALUE> = {
    Ok: (value: OK) => VALUE;
    Err: (err: ERR) => VALUE;
};

const isOptionMatch = <OK, ERR>(o: Option<OK> | Result<OK, ERR>): o is Option<OK> => o instanceof Option;
const isResultMatch = <OK, ERR>(o: Option<OK> | Result<OK, ERR>): o is Result<OK, ERR> => o instanceof Result;
const isOptionMatcher = <OK, ERR, VALUE>(m: OptionMatcher<OK, VALUE> | ResultMatcher<OK, ERR, VALUE>): m is OptionMatcher<OK, VALUE> => "Some" in m && "None" in m;
const isResultMatcher = <OK, ERR, VALUE>(m: OptionMatcher<OK, VALUE> | ResultMatcher<OK, ERR, VALUE>): m is ResultMatcher<OK, ERR, VALUE> => "Ok" in m && "Err" in m;

/**
 * Pattern-matches an `Option` or `Result` against its matcher, throwing if the two don't correspond.
 * @example
 * match(Ok(42), {
 *   Ok: (v) => `got ${v}`,
 *   Err: (e) => `failed: ${e}`,
 * }); // 'got 42'
 *
 * match(Some(1), {
 *   Some: (v) => v,
 *   None: () => 0,
 * }); // 1
 */
export function match<SOME, VALUE>(input: Option<SOME>, matcher: OptionMatcher<SOME, VALUE>): VALUE;
export function match<OK, ERR, VALUE>(input: Result<OK, ERR>, matcher: ResultMatcher<OK, ERR, VALUE>): VALUE;
export function match<OK, ERR, VALUE>(input: Option<OK> | Result<OK, ERR>, matcher: OptionMatcher<OK, VALUE> | ResultMatcher<OK, ERR, VALUE>): VALUE {

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

/**
 * Async-only counterpart of `match`, awaiting a `Promise<Option>`/`Promise<Result>` before matching.
 * @example
 * await matchAsync(buildResult(async () => 42), {
 *   Ok: (v) => `got ${v}`,
 *   Err: (e) => `failed: ${e}`,
 * }); // 'got 42'
 */
export async function matchAsync<SOME, VALUE>(input: Promise<Option<SOME>>, matcher: OptionMatcher<SOME, VALUE>): Promise<VALUE>;
export async function matchAsync<OK, ERR, VALUE>(input: Promise<Result<OK, ERR>>, matcher: ResultMatcher<OK, ERR, VALUE>): Promise<VALUE>;
export async function matchAsync<OK, ERR, VALUE>(input: Promise<Option<OK>> | Promise<Result<OK, ERR>>, matcher: OptionMatcher<OK, VALUE> | ResultMatcher<OK, ERR, VALUE>): Promise<VALUE> {
    const inputResult = await input;
    if (isOptionMatch(inputResult) && isOptionMatcher(matcher)) {
        const { Some, None } = matcher;
        if (inputResult.isSome()) {
            return Promise.resolve(Some(inputResult.unwrap()));
        }
        return Promise.resolve(None());
    }

    if (isResultMatch(inputResult) && isResultMatcher(matcher)) {
        const { Ok, Err } = matcher;
        if (inputResult.isOk()) {
            return Promise.resolve(Ok(inputResult.unwrap()));
        }
        return Promise.resolve(Err(inputResult.unwrapErr()));
    }

    throw new Error('MatchError: Input value type does not align with the provided handler, or a required handler function (e.g., Some, None, Ok, Err) is missing.');
}
