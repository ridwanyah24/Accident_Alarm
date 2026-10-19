/**
 * Bounded Exponential Backoff with Jitter for Notification Delivery Retries
 */

export interface BackoffConfig {
  baseDelayMs: number;
  maxDelayMs: number;
  maxAttempts: number;
}

export const defaultBackoffConfig: BackoffConfig = {
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 60000, // 60 seconds
  maxAttempts: 5
};

export function calculateBackoffDelay(
  attempt: number,
  config: BackoffConfig = defaultBackoffConfig
): number {
  if (attempt <= 0) return 0;
  // Exponential backoff: base * 2^(attempt - 1)
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
  const boundedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  // Add 10% random jitter to avoid thundering herd problem
  const jitter = Math.random() * (boundedDelay * 0.1);
  return Math.floor(boundedDelay + jitter);
}

export function isExhausted(
  attempt: number,
  config: BackoffConfig = defaultBackoffConfig
): boolean {
  return attempt >= config.maxAttempts;
}
