/**
 * Keyboard configurations for donation flow
 */

/**
 * Create main donation menu keyboard
 * @param {Object} session - User session data
 * @returns {Object} Inline keyboard markup
 */
function createMainDonationKeyboard(session) {
  const keyboard = [];

  // Amount selection buttons
  const amounts = [10000, 25000, 50000, 100000];
  const amountRow = amounts.map(amt => ({
    text: session.selectedAmount === amt ? `✅ Rp${amt.toLocaleString()}` : `Rp${amt.toLocaleString()}`,
    callback_data: `amt:${amt}`
  }));
  keyboard.push(amountRow);

  // Custom amount and pay buttons
  keyboard.push([
    { text: '💰 Custom Amount', callback_data: 'custom' },
    { text: '💳 Bayar', callback_data: 'pay' }
  ]);

  return { inline_keyboard: keyboard };
}

/**
 * Create QRIS status check keyboard
 * @param {string} orderId - Order ID for status checking
 * @returns {Object} Inline keyboard markup
 */
function createQrisStatusKeyboard(orderId) {
  return {
    inline_keyboard: [
      [{ text: '🔍 Cek Status Pembayaran', callback_data: `check:${orderId}` }]
    ]
  };
}

/**
 * Create confirmation keyboard (if needed for future features)
 * @returns {Object} Inline keyboard markup
 */
function createConfirmationKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '✅ Konfirmasi', callback_data: 'confirm' }],
      [{ text: '❌ Batal', callback_data: 'cancel' }]
    ]
  };
}

module.exports = {
  createMainDonationKeyboard,
  createQrisStatusKeyboard,
  createConfirmationKeyboard
};
