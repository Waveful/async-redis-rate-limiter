# async-redis-rate-limiter

[![Package Version](https://img.shields.io/npm/v/async-redis-rate-limiter?color=informational&label=package%20version&logo=npm)](https://www.npmjs.com/package/async-redis-rate-limiter)
[![Dependencies](https://img.shields.io/librariesio/release/npm/async-redis-rate-limiter?color=blue&logo=npm)](https://www.npmjs.com/package/async-redis-rate-limiter?activeTab=dependencies)
[![Requires Node](https://img.shields.io/node/v/async-redis-rate-limiter?color=informational&label=requires%20node&logo=node.js)](https://nodejs.org/about/releases/)

[![Tests](https://github.com/Waveful/async-redis-rate-limiter/actions/workflows/run-tests.yml/badge.svg?branch=main)](https://github.com/Waveful/async-redis-rate-limiter/actions/workflows/run-tests.yml)
[![Test Coverage](https://img.shields.io/codeclimate/coverage/Waveful/async-redis-rate-limiter?label=test%20coverage&logo=codeclimate)](https://codeclimate.com/github/Waveful/async-redis-rate-limiter/code?sort=-test_coverage)
[![Maintainability Score](https://img.shields.io/codeclimate/maintainability/Waveful/async-redis-rate-limiter?logo=codeclimate)](https://codeclimate.com/github/Waveful/async-redis-rate-limiter/maintainability)

Rate limit any action using a centralized Redis instance.

`async-redis-rate-limiter` is intended to be used when your servers are distributed across multiple systems or nodes (such as in Function-as-a-Service case) and you want to use a centralized location (the Redis instance) to store request counts.

 * Fixed-window algorithm
 * Window with milliseconds precision
 * Performance-oriented (uses the lowest number of operations possible, and only *O(1)* operations)
 * Tested with a throughput up to ≈ 5.7M actions per minute, using a local Redis instance
 * No race conditions

The fixed window algorithm counts all the actions performed during the window.
When the window ends the counter is restarted from zero.
The window will start when the first action arrives.

This is **not a rolling window**!
For example, if you specify 100 requests / hour, a user would be able to execute 1 request at 00:00, 99 requests at 00:59 and then another 100 requests at 01:00, resulting in 199 requests made in few minutes.
If you want to avoid this situation use a rolling-window algorithm (but consider that a fixed-window algorithm is simpler and faster).


## Quickstart

To use `async-redis-rate-limiter` with the fixed window counter...

#### 1. Install

```shell
npm install async-redis-rate-limiter
npm install redis
```

#### 2. Use

Example usage:

```javascript
// Get dependencies.
const { FixedWindowRateLimit, incrementFixedWindowCounter } = require("async-redis-rate-limiter");
const redis = require("redis");

// Initialize Redis client.
const redisHost = "localhost";
const redisPort = 6379;
const redisClient = redis.createClient({ url: `redis://${redisHost}:${redisPort}` });
await redisClient.connect();

// Define the action id that will be used for the counter,
// by using the same action id you're incrementing the same counter.
// A few good examples of data that can be used in the action id are: an IP address, a user identifier, an API key.
const userId = "userId";
const actionId = `action-name-${userId}`;

// Increment counter.
// In this example: max 10 actions, window of 3 minutes.
const response = await incrementFixedWindowCounter(redisClient, new FixedWindowRateLimit(actionId, 10, 3*60*1000));

// Check if over the limit.
if (response.isOverLimit) {
  console.warn("User reached the rate limit for the action."
    + `The new value of the counter is ${response.newValue},`
    + `the window will close in ${response.remainingTime} milliseconds.`);
} else {
  // Perform action.
  // This section can be executed at most 10 times in the window of 3 minutes (given the same actionId).
}
```


## Methods

### `incrementFixedWindowCounter(redisClient, rateLimit)`

Increments the value in the current window. Returns an object with the information about the fixed-window counter.

#### Arguments

* `redisClient`: A redis client instantiated with the [official Redis package](https://www.npmjs.com/package/redis).
* `rateLimit`: An instance of [FixedWindowRateLimit](#Classes), containing the specification of this rate limit.

#### Returns

`Promise`: A Promise containing the information about the updated fixed-window counter e.g.:
```javascript
{
  newValue: 1, // Updated value of the counter.
  remainingTime: 180000, // Milliseconds till the end of the window.
  isOverLimit: false, // Boolean indicating if the counter is over the limit.
}
```


## Classes

### `FixedWindowRateLimit(actionId, limit, window)`

Constructs a new instance of the FixedWindowRateLimit class.

#### Arguments

* `actionId`: A string representing the action to be rate-limited (same string = same counter). For security reasons it is recommended to **avoid using a variable inputted by the user** (if a user-input is used as actionId, a malicious user could modify other counters).
* `limit`: An integer number specifying the limit for the rate limiter, for example a limit equal to 10 means that the action can be performed at most 10 times during the fixed-window.
* `window`: An integer number specifying the duration of the window in milliseconds.

Example: maximum 10 visualization per user every 3 minutes:
```javascript
new FixedWindowRateLimit(`view-${userId}`, 10, 3*60*1000);
```

#### Returns

`FixedWindowRateLimit`: A new instance of the FixedWindowRateLimit class.


## License

Apache Version 2.0

See [LICENSE](./LICENSE)
