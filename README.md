# resultant.js

`resultant.js` is a JavaScript/TypeScript library designed to bring Go-style error handling (`goify`) and Rust-style `Result` and `Option` enums (`rustify`) into the JavaScript ecosystem. It provides a more expressive, safer, and functional approach to handling errors and optional values, helping to reduce uncaught exceptions and `null`/`undefined`-related bugs.

----
## Core Concepts

### Go-Style Error Handling (`goify`)

Inspired by Go's multi-return error handling pattern, the `goify` functions return a tuple `[result, error]`, where `result` is the successful return value of the operation and `error` is an error object if the operation fails. This allows the caller to explicitly handle both success and failure scenarios without relying on `try-catch` blocks.

### Rust-Style Error Handling (`rustify`)

Drawing inspiration from Rust's `Result<T, E>` and `Option<T>` enums, the `rustify` module provides `Result<T, E>` and `Option<T>` classes. These classes offer a rich set of methods to safely handle operations that might succeed or fail, and values that might be present or absent. This mechanism encourages explicit error handling and null-checking, thereby improving code robustness and readability.

----
## Installation

You can install `resultant.js` using npm or yarn:

```bash
npm install resultant.js
# or
yarn add resultant.js
```
----
## Usage

### Go-Style Error Handling (goify)

Use the `goify` and `goifySync` functions to wrap your asynchronous or synchronous operations.
```
import { goify, goifySync } from 'resultant.js/goify';

// Async operation example
const fetchData = async (shouldFail: boolean): Promise<string> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (shouldFail) {
                reject(new Error("Failed to load data!"));
            } else {
                resolve("Data loaded successfully!");
            }
        }, 100);
    });
};

async function handleAsyncOperation() {
    // Success case
    const [data, error] = await goify(() => fetchData(false));
    if (error) {
        console.error("Async operation failed:", error.message);
    } else {
        console.log("Async operation successful:", data); // Output: Data loaded successfully!
    }

    // Failure case
    const [data2, error2] = await goify(() => fetchData(true));
    if (error2) {
        console.error("Async operation failed:", error2.message); // Output: Failed to load data!
    } else {
        console.log("Async operation successful:", data2);
    }
}

// Sync operation example
const divide = (a: number, b: number): number => {
    if (b === 0) {
        throw new Error("Division by zero");
    }
    return a / b;
};

function handleSyncOperation() {
    // Success case
    const [result, err] = goifySync(() => divide(10, 2));
    if (err) {
        console.error("Sync operation failed:", err.message);
    } else {
        console.log("Sync operation successful:", result); // Output: 5
    }

    // Failure case
    const [result2, err2] = goifySync(() => divide(10, 0));
    if (err2) {
        console.error("Sync operation failed:", err2.message); // Output: Division by zero
    } else {
        console.log("Sync operation successful:", result2);
    }
}

handleAsyncOperation();
handleSyncOperation();
```


----
### Rust-Style Error Handling (rustify)

`SafeResult<T>` and `Option<T>` provide a richer, more functional API for handling fallible operations and optional values.
#### SafeResult&lt;T>

`SafeResult<T>` is used to represent an operation that may either succeed (`Ok`) or fail (`Err`).
```
import { buildResult, Ok, Err, Result } from 'resultant.js/rustify';

// Simulate an async operation that might succeed or fail
const performDatabaseQuery = async (userId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (userId === "invalid") {
                reject(new Error("Invalid user ID"));
            } else if (userId === "admin") {
                resolve("Admin data");
            } else {
                resolve(`Data for user ${userId}`);
            }
        }, 150);
    });
};

async function processUser(userId: string) {
    const result: Result<string, Error> = await buildResult(() => performDatabaseQuery(userId));

    if (result.isOk()) {
        console.log(`Query successful: ${result.unwrap()}`);
    } else {
        console.error(`Query failed: ${result.unwrapErr().message}`);
    }

    // More functional approach
    const processedData = result
        .map(data => data.toUpperCase()) // If Ok, transform the value to uppercase
        .unwrapOr("Default data"); // If Err, provide a default value

    console.log(`Processed data: ${processedData}`);

    // Chaining operations with andThen
    const chainedResult = await buildResult(() => performDatabaseQuery("admin"))
        .andThen(value => {
            console.log(`First step successful, value: ${value}`);
            return Ok(`Transformed: ${value}`); // Return a new Result
        });

    if (chainedResult.isOk()) {
        console.log(`Chained operation successful: ${chainedResult.unwrap()}`);
    } else {
        console.error(`Chained operation failed: ${chainedResult.unwrapErr().message}`);
    }
}

processUser("user123");
processUser("invalid");
processUser("admin");
```
#### Option&lt;T>

`Option<T>` is used to represent a value that may or may not be present (`Some` or `None`). This helps eliminate the need for `null` or `undefined` checks.
```
import { Some, None, Option } from 'resultant.js/rustify';

function getUserName(userId: number): Option<string> {
    const users: { [key: number]: string } = {
        1: "John Doe",
        2: "Jane Smith",
        3: "Peter Jones",
    };

    const name = users[userId];
    return name ? Some(name) : None();
}

function displayUserName(userId: number) {
    const userNameOption = getUserName(userId);

    if (userNameOption.isSome()) {
        console.log(`Found user name: ${userNameOption.unwrap()}`);
    } else {
        console.log(`User name not found for ID: ${userId}`);
    }

    // Using map to transform the value
    const greeting = userNameOption.map(name => `Hello, ${name}!`).unwrapOr("Hello, stranger!");
    console.log(greeting);

    // Using andThen for chained optional operations
    const userEmailOption = userNameOption.andThen(name => {
        if (name === "John Doe") {
            return Some("john.doe@example.com");
        }
        return None();
    });

    if (userEmailOption.isSome()) {
        console.log(`John Doe's email is: ${userEmailOption.unwrap()}`);
    } else {
        console.log("Email not found.");
    }
}

displayUserName(1);
displayUserName(4);
displayUserName(2);
```
#### `match` Function
The `match` function provides a pattern matching mechanism for `Option` and `Result` types. It allows you to explicitly handle `Some`/`None` or `Ok`/`Err` cases in a clear and type-safe manner.
```
import { match, Result, Option, Some, None, buildResult } from 'resultant.js/rustify';

// Using match with Result
async function processResult(shouldSucceed: boolean) {
    const myResult = await buildResult(async () => {
        if (shouldSucceed) {
            return "Operation successful!";
        }
        throw new Error("Operation failed!");
    });

    const output = match(myResult, {
        Ok: (value) => `Match (Result) success: ${value}`,
        Err: (error) => `Match (Result) error: ${error.message}`,
    });
    console.log(output);
}

// Using match with Option
function processOption(hasValue: boolean) {
    const myOption = hasValue ? Some("Option has a value") : None<string>();

    const output = match(myOption, {
        Some: (value) => `Match (Option) success: ${value}`,
        None: () => `Match (Option) no value.`,
    });
    console.log(output);
}

processResult(true);
processResult(false);
processOption(true);
processOption(false);
```
