const { createQrisStatusInlineKeyboard } = require('../keyboards/replyKeyboard');
const { generateOrderId } = require('../../utils/random');
const { createQrisTransaction } = require('../../services/pakasirService');
const { saveOrder } = require('../../services/orderService');
const { generateQRCode } = require('../../services/qrService');
const logger = require('../../utils/logger');

/**
 * Handle payment creation and QRIS generation
 */

/**
 * Handle payment initiation
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} userSessions - User sessions storage
 */
async function handlePaymentInitiation(bot, msg, userSessions) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Check if amount is selected
    if (!userSessions[userId]?.selectedAmount) {
      const text = '🎉 **Donasi — Bantu Sesama**\n\nMari bantu sesama dengan donasi Anda!\n\n❌ **Pilih nominal donasi terlebih dahulu!**\n\nGunakan tombol di bawah untuk memilih nominal.';
      const keyboard = require('../keyboards/replyKeyboard').createMainDonationReplyKeyboard(userSessions[userId]);

      await bot.sendMessage(chatId, text, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
      return;
    }

    const amount = userSessions[userId].selectedAmount;
    const orderId = generateOrderId();

    // Create QRIS transaction via Pakasir
    const qrisData = await createQrisTransaction(orderId, amount);

    // Save order to database
    await saveOrder({
      order_id: orderId,
      user_id: userId,
      username: msg.from.username || msg.from.first_name,
      amount: amount,
      qr_string: qrisData.payment_number,
      expired_at: qrisData.expired_at,
      status: 'pending'
    });

    // Generate QR code image
    const qrBuffer = await generateQRCode(qrisData.payment_number);

    // Send QR code to user
    const caption = `💰 **Total Pembayaran:** Rp${qrisData.total_payment.toLocaleString()}\n⏰ **Batas Waktu:** ${new Date(qrisData.expired_at).toLocaleString('id-ID')}\n\n📱 Scan QRIS di atas untuk menyelesaikan pembayaran.`;

    await bot.sendPhoto(chatId, qrBuffer, {
      caption: caption,
      parse_mode: 'Markdown',
      reply_markup: createQrisStatusInlineKeyboard(orderId)
    });

    // Clear session
    userSessions[userId].selectedAmount = null;
    userSessions[userId].awaitingCustomAmount = false;

    logger.info(`Created QRIS payment for user ${userId}, order ${orderId}, amount ${amount}`);

  } catch (error) {
    logger.error('Error in payment initiation handler:', error);
    const keyboard = require('../keyboards/replyKeyboard').createMainDonationReplyKeyboard(userSessions[userId]);
    await bot.sendMessage(chatId, '❌ Maaf, terjadi kesalahan dalam membuat transaksi. Silakan coba lagi.', {
      reply_markup: keyboard
    });
  }
}

module.exports = { handlePaymentInitiation };
