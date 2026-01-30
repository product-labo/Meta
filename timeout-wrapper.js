
/**
 * Timeout wrapper for long-running operations
 */
function withTimeout(promise, timeoutMs, operation = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}
