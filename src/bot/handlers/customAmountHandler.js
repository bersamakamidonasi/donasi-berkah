const { createMainDonationReplyKeyboard } = require('../keyboards/replyKeyboard');
const { getMainMenuText } = require('./startHandler');
const { validateDonationAmount } = require('../../utils/validateAmount');
const logger = require('../../utils/logger');

/**
 * Handle custom amount input
 */

/**
 * Handle custom amount request
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} userSessions - User sessions storage
 */
async function handleCustomAmountRequest(bot, msg, userSessions) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Initialize session if not exists
    if (!userSessions[userId]) {
      userSessions[userId] = {
        selectedAmount: null,
        awaitingCustomAmount: false,
        lastActivity: Date.now()
      };
    }

    userSessions[userId].awaitingCustomAmount = true;

    await bot.sendMessage(chatId, '💰 **Masukkan jumlah donasi custom (minimal Rp1.000):**\n\nKirim angka saja, contoh: `15000`', {
      parse_mode: 'Markdown',
      reply_markup: {
        force_reply: true
      }
    });

    logger.info(`User ${userId} requested custom amount input`);

  } catch (error) {
    logger.error('Error in custom amount request handler:', error);
    await bot.sendMessage(chatId, '❌ Gagal memproses permintaan.');
  }
}

/**
 * Handle custom amount text input
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} userSessions - User sessions storage
 */
async function handleCustomAmountInput(bot, msg, userSessions) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  // Skip if not awaiting custom amount
  if (!userSessions[userId]?.awaitingCustomAmount) {
    return;
  }

  try {
    // Validate amount
    const validation = validateDonationAmount(text);

    if (!validation.isValid) {
      await bot.sendMessage(chatId, `❌ ${validation.message}\n\nSilakan masukkan jumlah yang benar:`, {
        reply_markup: {
          force_reply: true
        }
      });
      return;
    }

    // Set custom amount
    userSessions[userId].selectedAmount = validation.amount;
    userSessions[userId].awaitingCustomAmount = false;

    const menuText = getMainMenuText(userSessions[userId]);
    const keyboard = createMainDonationReplyKeyboard(userSessions[userId]);

    await bot.sendMessage(chatId, menuText, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });

    logger.info(`User ${userId} set custom amount: ${validation.amount}`);

  } catch (error) {
    logger.error('Error in custom amount input handler:', error);
    await bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi.');
  }
}

module.exports = {
  handleCustomAmountRequest,
  handleCustomAmountInput
};
