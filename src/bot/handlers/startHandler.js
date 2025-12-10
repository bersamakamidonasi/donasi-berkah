const { createMainDonationReplyKeyboard } = require('../keyboards/replyKeyboard');
const logger = require('../../utils/logger');

/**
 * Handle /start command
 * Shows main donation menu with reply keyboard
 */

/**
 * Get main menu text
 * @param {Object} session - User session data
 * @returns {string} Formatted menu text
 */
function getMainMenuText(session) {
  let text = '🎉 **Donasi — Bantu Sesama**\n\n';
  text += 'Mari bantu sesama dengan donasi Anda!\n\n';

  if (session.selectedAmount) {
    text += `💰 **Nominal terpilih:** Rp${session.selectedAmount.toLocaleString()}\n`;
  } else {
    text += '💰 **Pilih nominal donasi di bawah**\n';
  }

  text += '\nGunakan tombol keyboard untuk memilih:';
  return text;
}

/**
 * Handle start command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} userSessions - User sessions storage
 */
async function handleStart(bot, msg, userSessions) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Initialize user session
    userSessions[userId] = {
      selectedAmount: null,
      awaitingCustomAmount: false,
      lastActivity: Date.now()
    };

    const text = '🎉 **Donasi — Bantu Sesama**\n\nMari bantu sesama dengan donasi Anda!\n\n💰 **Pilih nominal donasi di bawah**\n\nGunakan tombol keyboard untuk memilih:';
    const keyboard = createMainDonationReplyKeyboard(userSessions[userId]);

    await bot.sendMessage(chatId, text, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });

    logger.info(`User ${userId} started donation bot`);

  } catch (error) {
    logger.error('Error in start handler:', error);
    await bot.sendMessage(chatId, '❌ Maaf, terjadi kesalahan. Silakan coba lagi.');
  }
}

module.exports = { handleStart };
