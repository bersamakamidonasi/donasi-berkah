require('dotenv').config();

// Import dependencies
const TelegramBot = require('node-telegram-bot-api');
const QRCode = require('qrcode');

// Import modular modules
const { config } = require('./src/config/env');
const { handleStart } = require('./src/bot/handlers/startHandler');
const { handleAmountSelection } = require('./src/bot/handlers/amountHandler');
const { handleCustomAmountRequest, handleCustomAmountInput } = require('./src/bot/handlers/customAmountHandler');
const { handlePaymentInitiation } = require('./src/bot/handlers/paymentHandler');
const { createMainDonationReplyKeyboard } = require('./src/bot/keyboards/replyKeyboard');
const { createQrisStatusInlineKeyboard } = require('./src/bot/keyboards/replyKeyboard');
const { createQrisTransaction, checkQrisStatus } = require('./src/services/pakasirService');
const { saveOrder, updateOrderStatus } = require('./src/services/orderService');
const { validateDonationAmount } = require('./src/utils/validateAmount');
const { generateOrderId } = require('./src/utils/random');
const logger = require('./src/utils/logger');

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  // Don't exit, just log
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // Don't exit, just log
});

// Validate environment configuration
try {
  require('./src/config/env').validateConfig();
} catch (error) {
  console.error('Environment validation failed:', error.message);
  process.exit(1);
}

const token = config.BOT_TOKEN;

// Create bot instance with polling
const bot = new TelegramBot(token, { polling: true });

// Log successful bot initialization
console.log('🤖 Bot initialized successfully');
console.log('📡 Polling mode active');

// In-memory storage for orders and sessions
let orders = {};
let sessions = {};

// Session timeout: 10 minutes
const SESSION_TIMEOUT = 10 * 60 * 1000;

// Function to clean expired sessions
function cleanExpiredSessions() {
  const now = Date.now();
  for (const userId in sessions) {
    if (now - sessions[userId].lastActivity > SESSION_TIMEOUT) {
      delete sessions[userId];
    }
  }
}

// Handle /start
bot.onText(/\/start/, (msg) => {
  handleStart(bot, msg, sessions);
});

// Handle callback queries (for status checking)
bot.on('callback_query', async (query) => {
  const data = query.data;

  if (data.startsWith('check:')) {
    const orderId = data.split(':')[1];
    // Handle status check
    try {
      const statusData = await checkQrisStatus(orderId, orders[orderId]?.amount);
      if (statusData.status === 'completed') {
        orders[orderId].status = 'verified';
        await bot.sendMessage(orders[orderId].userId, '✅ Pembayaran berhasil diverifikasi!');
        await bot.sendMessage(config.OWNER_ID, `📢 Donasi Masuk!\n👤 ${orders[orderId].username}\n💰 Rp${orders[orderId].amount.toLocaleString()}\n✅ BERHASIL`);
      }
      await bot.answerCallbackQuery(query.id, { text: `Status: ${statusData.status?.toUpperCase() || 'unknown'}` });
    } catch (error) {
      console.error('Error checking payment status:', error);
      await bot.answerCallbackQuery(query.id, { text: 'Gagal cek status' });
    }
  }
});

// Handle text messages (reply keyboard buttons)
bot.on('message', async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!text || text.startsWith('/')) return;

  // Initialize session if not exists
  if (!sessions[userId]) {
    sessions[userId] = {
      selectedAmount: null,
      awaitingCustomAmount: false,
      lastActivity: Date.now()
    };
  }

  sessions[userId].lastActivity = Date.now();

  // Handle reply keyboard button presses
  if (['Rp10.000', 'Rp25.000', 'Rp50.000', 'Rp100.000'].includes(text)) {
    // Handle amount selection
    handleAmountSelection(bot, msg, sessions);
  } else if (text === '💰 Custom Nominal') {
    // Handle custom amount request
    handleCustomAmountRequest(bot, msg, sessions);
  } else if (sessions[userId].awaitingCustomAmount) {
    // Handle custom amount input
    handleCustomAmountInput(bot, msg, sessions);
  } else if (text === '💳 Bayar') {
    // Handle payment initiation
    if (!sessions[userId].selectedAmount) {
      const menuText = '🎉 **Donasi — Bantu Sesama**\n\nMari bantu sesama dengan donasi Anda!\n\n❌ **Pilih nominal donasi terlebih dahulu!**\n\nGunakan tombol di bawah untuk memilih nominal.';
      const keyboard = createMainDonationReplyKeyboard(sessions[userId]);

      await bot.sendMessage(chatId, menuText, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
      return;
    }

    // Create QRIS transaction
    const orderId = generateOrderId();
    try {
      const qrisResponse = await createQrisTransaction(orderId, sessions[userId].selectedAmount);

      orders[orderId] = {
        userId,
        username: msg.from.username || msg.from.first_name,
        amount: sessions[userId].selectedAmount,
        method: 'qris',
        status: 'pending',
        qrisData: qrisResponse,
        createdAt: new Date()
      };

      // Generate QR code using the QRCode library directly
      const qrBuffer = await QRCode.toBuffer(qrisResponse.payment_number, { type: 'png', width: 300 });

      await bot.sendPhoto(chatId, qrBuffer, {
        caption: `💰 **Total Pembayaran:** Rp${qrisResponse.total_payment.toLocaleString()}\n⏰ **Batas Waktu:** ${new Date(qrisResponse.expired_at).toLocaleString('id-ID')}\n\n📱 Scan QRIS di atas untuk menyelesaikan pembayaran.`,
        parse_mode: 'Markdown',
        reply_markup: createQrisStatusInlineKeyboard(orderId)
      });

      // Clear session
      sessions[userId].selectedAmount = null;
      sessions[userId].awaitingCustomAmount = false;

    } catch (error) {
      console.error('QRIS creation error:', error);
      const keyboard = createMainDonationReplyKeyboard(sessions[userId]);
      await bot.sendMessage(chatId, '❌ Maaf, terjadi kesalahan dalam membuat transaksi. Silakan coba lagi.', {
        reply_markup: keyboard
      });
    }
  }
});

// Clean expired sessions periodically
setInterval(cleanExpiredSessions, 5 * 60 * 1000); // Every 5 minutes

console.log('Bot is running...');

// Export bot instance for potential webhook usage
module.exports = { bot, orders, sessions };
