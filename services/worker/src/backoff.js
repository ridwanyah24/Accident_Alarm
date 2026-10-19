"use strict";
/**
 * Bounded Exponential Backoff with Jitter for Notification Delivery Retries
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultBackoffConfig = void 0;
exports.calculateBackoffDelay = calculateBackoffDelay;
exports.isExhausted = isExhausted;
exports.defaultBackoffConfig = {
    baseDelayMs: 1000, // 1 second
    maxDelayMs: 60000, // 60 seconds
    maxAttempts: 5
};
function calculateBackoffDelay(attempt, config = exports.defaultBackoffConfig) {
    if (attempt <= 0)
        return 0;
    // Exponential backoff: base * 2^(attempt - 1)
    const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
    const boundedDelay = Math.min(exponentialDelay, config.maxDelayMs);
    // Add 10% random jitter to avoid thundering herd problem
    const jitter = Math.random() * (boundedDelay * 0.1);
    return Math.floor(boundedDelay + jitter);
}
function isExhausted(attempt, config = exports.defaultBackoffConfig) {
    return attempt >= config.maxAttempts;
}
