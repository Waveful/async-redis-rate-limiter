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

import { RedisClientType } from "redis";
import { FixedWindowRateLimit, GetStatusFixedWindowResponse, IncrementFixedWindowResponse } from "./fixed-window-types";

// Debug Settings
export const DEBUG_SETTINGS = {
  logRedisReplies: false,
};

/**
 * Increments the value in the current window. Returns an object with the information about the limit.
 * Example: maximum 10 visualization per user every 3 minutes => incrementFixedWindowRateLimiter(redisClient, new FixedWindowRateLimit(`view-${userId}`, 10, 3*60*1000))
 * @param redisClient the Redis client connected to the Redis DB, used for rate limiting data.
 * @param rateLimit object that specifies the action (actionId) and the rate options (limit and window).
 * @param increment how much to increment for this action, by default the increment is one (1 action = 1 increment), but in some cases it may be useful to make some actions "weight" more.
 */
export async function incrementFixedWindowRateLimiter(redisClient: RedisClientType, rateLimit: FixedWindowRateLimit, increment: number = 1): Promise<IncrementFixedWindowResponse> {
  // Prepare values.
  const key = "ARRL:" + rateLimit.actionId;
  let remainingTime: number;
  let newValue: number;

  // Execute Redis action.
  const [setReply, incrByReply, pTtlReply] = await redisClient
    .multi()
    .SET(key, 0, {
      PX: rateLimit.window,
      NX: true,
    }) // If key does not exist (NX=true) start the counter (value=0) and the window (PX=window)
    .INCRBY(key, increment) // Increment the counter.
    .PTTL(key) // Get the remaining time of the window.
    .exec() as [string | null | undefined, number, number];
  if (DEBUG_SETTINGS.logRedisReplies) console.log("SET: " + setReply + ", INCRBY: " + incrByReply + ", PTTL: " + pTtlReply + ".");
  newValue = incrByReply;
  remainingTime = pTtlReply;

  // Check for unexpected values caused by changes in the limit.
  // pttlReply === -1: happens when the key does not have an expiration.
  // pttlReply > rateLimit.window: happens when the user of the rate limiter changed the window length making it smaller .
  if (pTtlReply && (pTtlReply === -1 || pTtlReply > rateLimit.window)) { // A negative Time-To-Live is returned when the key does not exist
    const pExpireReply = await redisClient.PEXPIRE(key, rateLimit.window); // Set new Time-To-Live.
    if (DEBUG_SETTINGS.logRedisReplies) console.log("PEXPIRE: " + pExpireReply + ".");
    remainingTime = rateLimit.window;
  }

  // Return result.
  return {
    newValue: newValue,
    remainingTime: remainingTime,
    isOverLimit: newValue > rateLimit.limit,
  };
}

/**
 * Returns information about the rate limiter specified by actionId.
 * The returned information are the current value of the counter (currentValue) and the remaining time in the window in milliseconds (remainingTime).
 * @param redisClient the Redis client connected to the Redis DB, used for rate limiting data.
 * @param actionId An identifier for the action to be rate-limited.
 */
export async function getStatusFixedWindowRateLimiter(redisClient: RedisClientType, actionId: string): Promise<GetStatusFixedWindowResponse> {
  // Prepare values.
  const key = "ARRL:" + actionId;

  // Execute Redis action.
  const [getReply, pTtlReply] = await redisClient
    .multi()
    .GET(key) // Get the current value.
    .PTTL(key) // Get the remaining time of the window.
    .exec() as [string | null | undefined, number];
  if (DEBUG_SETTINGS.logRedisReplies) console.log("GET: " + getReply + ", PTTL: " + pTtlReply + ".");

  // Return result.
  const currentValue: number = getReply == null ? 0 : parseInt(getReply);
  const remainingTime: number = pTtlReply < 0 ? 0 : pTtlReply;
  return {
    currentValue: currentValue,
    remainingTime: remainingTime,
  };
}
