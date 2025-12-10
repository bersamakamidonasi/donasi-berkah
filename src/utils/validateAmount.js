/**
 * Amount validation utilities
 */

/**
 * Minimum donation amount
 */
const MIN_DONATION_AMOUNT = 1000;

/**
 * Validate donation amount
 * @param {number|string} amount - Amount to validate
 * @returns {Object} Validation result with isValid and message
 */
function validateDonationAmount(amount) {
  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseInt(amount.replace(/[^\d]/g, '')) : amount;

  // Check if valid number
  if (isNaN(numAmount)) {
    return {
      isValid: false,
      message: 'Jumlah donasi harus berupa angka yang valid.'
    };
  }

  // Check minimum amount
  if (numAmount < MIN_DONATION_AMOUNT) {
    return {
      isValid: false,
      message: `Minimal donasi adalah Rp${MIN_DONATION_AMOUNT.toLocaleString()}.`
    };
  }

  // Check maximum amount (optional, prevent spam)
  const MAX_DONATION_AMOUNT = 10000000; // 10 million
  if (numAmount > MAX_DONATION_AMOUNT) {
    return {
      isValid: false,
      message: `Maksimal donasi adalah Rp${MAX_DONATION_AMOUNT.toLocaleString()}.`
    };
  }

  return {
    isValid: true,
    amount: numAmount,
    message: 'Jumlah donasi valid.'
  };
}

/**
 * Format amount for display
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount string
 */
function formatAmount(amount) {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

/**
 * Check if amount is within valid range
 * @param {number} amount - Amount to check
 * @returns {boolean} Whether amount is valid
 */
function isValidAmount(amount) {
  return amount >= MIN_DONATION_AMOUNT && amount <= 10000000;
}

module.exports = {
  MIN_DONATION_AMOUNT,
  validateDonationAmount,
  formatAmount,
  isValidAmount
};
