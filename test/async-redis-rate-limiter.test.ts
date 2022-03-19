/*!
 * Copyright 2022 Waveful
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {expect, assert} from "chai";
import * as asyncRedisRateLimiter from "../src/index";
import * as redis from "redis";
import * as customUuid from "custom-uuid";

describe('asyncRedisRateLimiter', () => {

  let redisClient: redis.RedisClientType;

  before(async () => {
    redisClient = await getRedisClient();
  });

  after(async () => {
    await redisClient.quit();
  });

  it('incrementFixedWindowRateLimiter, standard usage', async () => {
    const actionId: string = customUuid.generateShortUuid();
    const limit: number = 3;
    const window: number = 1000;
    const rateLimit: asyncRedisRateLimiter.FixedWindowRateLimit = new asyncRedisRateLimiter.FixedWindowRateLimit(actionId, limit, window);
    let getStatusResponse: asyncRedisRateLimiter.GetStatusFixedWindowResponse;
    let incrementResponse: asyncRedisRateLimiter.IncrementFixedWindowResponse;

    // Get initial status
    getStatusResponse = await asyncRedisRateLimiter.getStatusFixedWindowRateLimiter(redisClient, actionId);
    expect(getStatusResponse.currentValue).to.be.equal(0);
    expect(getStatusResponse.remainingTime).to.be.equal(0);

    // Action
    incrementResponse = await asyncRedisRateLimiter.incrementFixedWindowRateLimiter(redisClient, rateLimit);
    expect(incrementResponse.newValue).to.be.equal(1);
    expect(incrementResponse.remainingTime).to.be.equal(window);
    expect(incrementResponse.isOverLimit).to.be.equal(1 > limit);

    // Get status
    getStatusResponse = await asyncRedisRateLimiter.getStatusFixedWindowRateLimiter(redisClient, actionId);
    expect(getStatusResponse.currentValue).to.be.equal(1);
    expect(getStatusResponse.remainingTime).to.be.approximately(window, 100);
  }).timeout(2*60*1000);
});

let globalRedisClient: redis.RedisClientType;
async function getRedisClient(): Promise<redis.RedisClientType> {
  if (!globalRedisClient || !globalRedisClient.isOpen) {
    // Prepare variables needed.
    const redisHost: string = "localhost";
    const redisPort: number = 6379;

    // Start connecting.
    console.log(`Creating redis client, using host: "${redisHost}", port: "${redisPort}".`);
    console.time("createRedisClient");
    console.time("connectRedisClient");

    // See: https://github.com/redis/node-redis/blob/master/docs/client-configuration.md
    globalRedisClient = redis.createClient({
      // redis[s]://[[username][:password]@][host][:port][/db-number]
      url: `redis://${redisHost}:${redisPort}`,

      // Maximum length of the client's internal command queue. If null then there will be no max length.
      // Default = undefined
      commandsQueueMaxLength: undefined,

      // When a socket closes unexpectedly, all the commands that were already sent will reject as they might have been executed on the server.
      // The rest will remain queued in memory until a new socket is established (an offline queue that will be executed when returning online).
      // If you don't want to queue commands in memory until a new socket is established, set the disableOfflineQueue option to true. This will result in those commands being rejected.
      // Note: If the offline queue is enabled and the client is closed, either by returning an error from reconnectStrategy or by manually calling .disconnect(), the commands in the offline queue will be rejected.
      // Default = false
      disableOfflineQueue: false,

      // If set to true enables read queries for a connection to a Redis Cluster replica node.
      // Clients can use replicas in order to scale reads using the READONLY option.
      // READONLY tells a Redis Cluster replica node that the client is willing to read possibly stale data and is not interested in running write queries.
      // Default = false
      readonly: false,

      socket: {
        // The timeout for connecting to the Redis Server (in milliseconds).
        // Default = 5000
        connectTimeout: 5000,

        // If set to false it will attempt to optimize throughput at the expense of latency by adding a delay.
        // Default = true
        noDelay: true,

        // Enable/disable keep-alive functionality, and optionally set the initial delay (in milliseconds) before the first keepalive probe is sent on an idle socket.
        // Default = 5000
        keepAlive: 5000,

        // See: https://github.com/redis/node-redis/blob/master/docs/client-configuration.md#reconnect-strategy
        // If the function returns `Error`: closes the client and flushes the internal command queues (the commands in queue will be rejected).
        // If the function returns `number`: the number will be used as the wait time in milliseconds prior attempting to reconnect.
        // Default = (retries) => Math.min(retries * 50, 500)
        reconnectStrategy: (retries) => {
          console.log("Redis: trying to reconnect... Retrial #" + retries);
          if (retries >= 6) {
            return Error("Redis Error: Too many attempts to reconnect");
          } else {
            // 1° retrial (retries=0): 16 ms of wait time
            // 2° retrial (retries=1): 32 ms of wait time
            // 3° retrial (retries=2): 64 ms of wait time
            // 4° retrial (retries=3): 128 ms of wait time
            // 5° retrial (retries=4): 256 ms of wait time
            // 6° retrial (retries=5): 512 ms of wait time
            return Math.min(2 ** (retries + 4), 512);
          }
        },
      },
    });

    // See: https://github.com/redis/node-redis#events
    globalRedisClient.on('connect', () => console.log('Redis: connect'));
    globalRedisClient.on('ready', () => console.log('Redis: ready'));
    globalRedisClient.on('end', () => console.log('Redis: end'));
    globalRedisClient.on('error', (err) => console.log('Redis Error: ', err));
    globalRedisClient.on('reconnecting', () => console.log('Redis: reconnecting'));

    console.timeEnd("createRedisClient");

    await globalRedisClient.connect();
    console.timeEnd("connectRedisClient")
  }
  return globalRedisClient;
}
