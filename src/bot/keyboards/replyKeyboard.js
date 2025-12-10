/**
 * Reply keyboard configurations for donation bot
 * Uses reply keyboard (persistent at bottom) instead of inline keyboard
 */

/**
 * Create main donation reply keyboard
 * @param {Object} session - User session data
 * @returns {Object} Reply keyboard markup
 */
function createMainDonationReplyKeyboard(session) {
  const keyboard = [
    [
      { text: 'Rp10.000' },
      { text: 'Rp25.000' }
    ],
    [
      { text: 'Rp50.000' },
      { text: 'Rp100.000' }
    ],
    [
      { text: '💰 Custom Nominal' }
    ],
    [
      { text: '💳 Bayar' }
    ]
  ];

  return {
    keyboard: keyboard,
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: false
  };
}

/**
 * Create QRIS status inline keyboard (for QR message)
 * @param {string} orderId - Order ID for status checking
 * @returns {Object} Inline keyboard markup
 */
function createQrisStatusInlineKeyboard(orderId) {
  return {
    inline_keyboard: [
      [{ text: '🔍 Cek Status Pembayaran', callback_data: `check:${orderId}` }]
    ]
  };
}

module.exports = {
  createMainDonationReplyKeyboard,
  createQrisStatusInlineKeyboard
};
