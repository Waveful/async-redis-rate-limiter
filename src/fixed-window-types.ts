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

export type GetStatusFixedWindowResponse = {
  currentValue: number; // Number of actions done on the key during the window.
  remainingTime: number; // Milliseconds remaining until the window resets and therefore the counter restarts.
};
