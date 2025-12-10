const axios = require('axios');
const { config } = require('../config/env');

/**
 * Pakasir payment gateway service
 * Handles QRIS transaction creation and status checking
 */

/**
 * Create QRIS transaction via Pakasir API
 * @param {string} orderId - Unique order ID
 * @param {number} amount - Transaction amount
 * @returns {Promise<Object>} QRIS transaction data
 */
async function createQrisTransaction(orderId, amount) {
  try {
    const response = await axios.post('https://app.pakasir.com/api/transactioncreate/qris', {
      project: config.PAKASIR_PROJECT,
      order_id: orderId,
      amount: amount,
      api_key: config.PAKASIR_API_KEY
    });

    return response.data;
  } catch (error) {
    console.error('Pakasir API Error:', error.response?.data || error.message);
    throw new Error('Failed to create QRIS transaction');
  }
}

/**
 * Check QRIS transaction status via Pakasir API
 * @param {string} orderId - Order ID to check
 * @param {number} amount - Transaction amount for validation
 * @returns {Promise<Object>} Transaction status data
 */
async function checkQrisStatus(orderId, amount) {
  try {
    const response = await axios.get('https://app.pakasir.com/api/transactiondetail', {
      params: {
        project: config.PAKASIR_PROJECT,
        amount: amount,
        order_id: orderId,
        api_key: config.PAKASIR_API_KEY
      }
    });

    // The API returns data in format { transaction: {...} }
    // Return the transaction object directly for consistency
    return response.data.transaction || response.data;
  } catch (error) {
    console.error('Pakasir Status Check Error:', error.response?.data || error.message);
    throw new Error('Failed to check payment status');
  }
}

/**
 * Validate Pakasir webhook signature (if implemented)
 * @param {Object} payload - Webhook payload
 * @param {string} signature - Webhook signature
 * @returns {boolean} Whether signature is valid
 */
function validateWebhookSignature(payload, signature) {
  // Implement signature validation if Pakasir provides webhook signatures
  // For now, return true (implement based on Pakasir documentation)
  return true;
}

module.exports = {
  createQrisTransaction,
  checkQrisStatus,
  validateWebhookSignature
};
