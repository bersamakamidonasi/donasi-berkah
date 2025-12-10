/**
 * Utility functions for generating random values
 */

/**
 * Generate unique order ID
 * Format: ORD + timestamp + random string
 * @returns {string} Unique order ID
 */
function generateOrderId() {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substr(2, 5);
  return `ORD${timestamp}${randomStr}`;
}

/**
 * Generate random string of specified length
 * @param {number} length - Length of random string
 * @returns {string} Random string
 */
function generateRandomString(length = 8) {
  return Math.random().toString(36).substr(2, length);
}

module.exports = {
  generateOrderId,
  generateRandomString
};
