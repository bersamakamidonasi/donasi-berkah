const { createMainDonationKeyboard } = require('../keyboards/donationKeyboard');
const { getMainMenuText } = require('./startHandler');
const logger = require('../../utils/logger');

/**
 * Handle donation amount selection
 */

/**
 * Handle amount selection callback
 * @param {Object} bot - Telegram bot instance
 * @param {Object} query - Callback query object
 * @param {Object} userSessions - User sessions storage
 */
async function handleAmountSelection(bot, query, userSessions) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  try {
    const amount = parseInt(data.split(':')[1]);

    // Initialize session if not exists
    if (!userSessions[userId]) {
      userSessions[userId] = {
        selectedAmount: null,
        awaitingCustomAmount: false,
        lastActivity: Date.now()
      };
    }

    // Toggle amount selection
    if (userSessions[userId].selectedAmount === amount) {
      userSessions[userId].selectedAmount = null;
    } else {
      userSessions[userId].selectedAmount = amount;
    }

    // Clear custom amount awaiting state
    userSessions[userId].awaitingCustomAmount = false;

    const text = getMainMenuText(userSessions[userId]);
    const keyboard = createMainDonationKeyboard(userSessions[userId]);

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });

    logger.info(`User ${userId} selected amount: ${userSessions[userId].selectedAmount || 'none'}`);

  } catch (error) {
    logger.error('Error in amount selection handler:', error);
    await bot.answerCallbackQuery(query.id, {
      text: '❌ Gagal memproses pilihan nominal.',
      show_alert: true
    });
  }
}

module.exports = { handleAmountSelection };
