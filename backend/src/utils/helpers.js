/**
 * Utility helper functions
 */

/**
 * Format LSK amount for display
 */
export function formatZecAmount(amount) {
  // Note: This was originally for Zcash, now adapted for LSK
  if (typeof amount !== 'number') {
    return '0.00000000';
  }
  
  return (amount / 100000000).toFixed(8); // Convert Beddows to LSK
}

/**
 * Sanitize LSK amount input
 */
export function sanitizeZecAmount(amount) {
  // Note: This was originally for Zcash, now adapted for LSK
  if (typeof amount === 'string') {
    amount = parseFloat(amount);
  }
  
  if (isNaN(amount) || amount < 0) {
    return 0;
  }
  
  // Convert to Beddows and back to ensure precision
  return Math.floor(amount * 100000000) / 100000000;
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate random string
 */
export function generateRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Validate Lisk address format
 */
export function isValidLiskAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Lisk addresses are typically 20-21 characters long and end with 'L'
  const liskAddressRegex = /^[0-9]{1,21}L$/;
  return liskAddressRegex.test(address);
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
  
  throw lastError;
}