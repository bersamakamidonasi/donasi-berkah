const { createMainDonationReplyKeyboard } = require('../keyboards/replyKeyboard');
const { getMainMenuText } = require('./startHandler');
const logger = require('../../utils/logger');

/**
 * Handle amount selection via reply keyboard
 */

/**
 * Handle amount selection from reply keyboard
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} userSessions - User sessions storage
 */
async function handleAmountSelection(bot, msg, userSessions) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  try {
    // Initialize session if not exists
    if (!userSessions[userId]) {
      userSessions[userId] = {
        selectedAmount: null,
        awaitingCustomAmount: false,
        lastActivity: Date.now()
      };
    }

    let amount = null;

    // Parse amount from text
    if (text === 'Rp10.000') {
      amount = 10000;
    } else if (text === 'Rp25.000') {
      amount = 25000;
    } else if (text === 'Rp50.000') {
      amount = 50000;
    } else if (text === 'Rp100.000') {
      amount = 100000;
    }

    if (amount) {
      // Set selected amount
      userSessions[userId].selectedAmount = amount;
      userSessions[userId].awaitingCustomAmount = false;

      const menuText = getMainMenuText(userSessions[userId]);
      const keyboard = createMainDonationReplyKeyboard(userSessions[userId]);

      await bot.sendMessage(chatId, menuText, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });

      logger.info(`User ${userId} selected amount: ${amount}`);
    }

  } catch (error) {
    logger.error('Error in amount selection handler:', error);
    await bot.sendMessage(chatId, '❌ Gagal memproses pilihan nominal.');
  }
}

module.exports = { handleAmountSelection };
