/**
 * RetryHelper - Retry logic for flaky operations.
 */
const RetryHelper = {
  async retryAction(fn, maxRetries = 3, delayMs = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delayMs * attempt));
        }
      }
    }
    throw lastError;
  },

  async waitForCondition(fn, timeout = 10000, interval = 500) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await fn()) { return true; }
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },
};

module.exports = RetryHelper;
