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

export class FixedWindowRateLimit {
  // Identifies the action to be rate-limited.
  actionId: string;

  // Max number of actions during the fixed-window.
  // This limit is inclusive.
  // For example by using a limit of 3:
  // - 3 actions during the window: OK
  // - 4 actions during the window: over the limit.
  limit: number;

  // Dimension in milliseconds of the fixed-window.
  window: number;

  constructor(actionId: string, limit: number, window: number) {
    this.actionId = actionId;
    this.limit = limit;
    this.window = window;
  }
}

export type IncrementFixedWindowResponse = {
  newValue: number; // Number of actions done on the key during the window, after the executed increment.
  remainingTime: number; // Milliseconds remaining until the window resets and therefore the counter restarts.
  isOverLimit: boolean; // True if newValue is over the limit (rate exceeded).
};

export type GetFixedWindowStatusResponse = {
  currentValue: number; // Number of actions done on the key during the window.
  remainingTime: number; // Milliseconds remaining until the window resets and therefore the counter restarts.
};
