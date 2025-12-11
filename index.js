require('dotenv').config();

// Import dependencies
const TelegramBot = require('node-telegram-bot-api');
const QRCode = require('qrcode');

// Import modular modules
const { config } = require('./src/config/env');
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

// Create bot instance
const bot = new TelegramBot(token);

// Log successful bot initialization
console.log('🤖 Bot initialized successfully');

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

// Enhanced Start Handler - Built-in
async function handleStart(bot, msg, sessions) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const firstName = msg.from.first_name || 'Sahabat';

  // Initialize or reset session
  sessions[userId] = {
    selectedAmount: null,
    awaitingCustomAmount: false,
    lastActivity: Date.now()
  };

  // Enhanced welcome message with better formatting and emotional appeal
  const welcomeMessage = `
╔═══════════════════════╗
   ✨ *SELAMAT DATANG* ✨
╚═══════════════════════╝

Hai *${firstName}*! 👋

Terima kasih sudah membuka hatimu untuk *berbagi kebahagiaan* dengan sesama 💝

━━━━━━━━━━━━━━━━━━━
🌟 *Kenapa Donasi Penting?*

• Setiap rupiah kamu berarti
• Membantu mereka yang membutuhkan
• Berbagi rezeki = Barakah berlimpah
• Kebaikan kecil, dampak besar!

━━━━━━━━━━━━━━━━━━━

💡 *Cara Donasi Mudah:*
1️⃣ Pilih nominal donasi
2️⃣ Klik tombol "💳 Bayar"
3️⃣ Scan QRIS yang muncul
4️⃣ Selesai! ✨

━━━━━━━━━━━━━━━━━━━

🎯 *Mulai Berbagi Sekarang!*
Pilih nominal di bawah atau masukkan jumlah custom sesuai kemampuanmu 👇
`;

  const keyboard = createMainDonationReplyKeyboard(sessions[userId]);

  try {
    await bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Error sending start message:', error);
    // Fallback without markdown if formatting fails
    await bot.sendMessage(chatId,
      `Selamat datang ${firstName}! Mari berbagi kebahagiaan dengan donasi. Pilih nominal di bawah ini:`,
      { reply_markup: keyboard }
    );
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

        // Enhanced success message to user
        const successMessage = `
✅ *PEMBAYARAN BERHASIL!*

Terima kasih atas donasimu! 🎉

💰 *Nominal:* Rp${orders[orderId].amount.toLocaleString()}
📅 *Tanggal:* ${new Date().toLocaleString('id-ID')}

━━━━━━━━━━━━━━━━━━━

💝 Setiap kebaikan yang kamu berikan akan kembali dengan cara yang lebih indah. Barakallah!

🌟 Mau donasi lagi? Ketik /start
`;

        await bot.sendMessage(orders[orderId].userId, successMessage, {
          parse_mode: 'Markdown'
        });

        // Enhanced notification to owner
        await bot.sendMessage(config.OWNER_ID,
          `🎊 *DONASI BARU MASUK!*\n\n` +
          `👤 *Donatur:* ${orders[orderId].username}\n` +
          `💰 *Nominal:* Rp${orders[orderId].amount.toLocaleString()}\n` +
          `📅 *Waktu:* ${new Date().toLocaleString('id-ID')}\n` +
          `✅ *Status:* BERHASIL`,
          { parse_mode: 'Markdown' }
        );
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
      const menuText = `
⚠️ *Belum Pilih Nominal*

Kamu belum memilih nominal donasi nih!

Silakan pilih nominal terlebih dahulu menggunakan tombol di bawah 👇
`;
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

      // Enhanced payment message
      const paymentMessage = `
╔═══════════════════════╗
   💳 *LANJUTKAN PEMBAYARAN*
╚═══════════════════════╝

💰 *Total Pembayaran:*
   Rp${qrisResponse.total_payment.toLocaleString()}

⏰ *Batas Waktu:*
   ${new Date(qrisResponse.expired_at).toLocaleString('id-ID')}

━━━━━━━━━━━━━━━━━━━

📱 *Cara Bayar:*
1. Buka aplikasi mobile banking/e-wallet
2. Pilih menu QRIS/Scan
3. Scan QR code di atas
4. Konfirmasi pembayaran

━━━━━━━━━━━━━━━━━━━

✅ Klik tombol "Cek Status" setelah bayar untuk verifikasi otomatis!
`;

      await bot.sendPhoto(chatId, qrBuffer, {
        caption: paymentMessage,
        parse_mode: 'Markdown',
        reply_markup: createQrisStatusInlineKeyboard(orderId)
      });

      // Clear session
      sessions[userId].selectedAmount = null;
      sessions[userId].awaitingCustomAmount = false;

    } catch (error) {
      console.error('QRIS creation error:', error);
      const keyboard = createMainDonationReplyKeyboard(sessions[userId]);
      await bot.sendMessage(chatId,
        '❌ *Oops! Terjadi Kesalahan*\n\n' +
        'Maaf, sistem sedang mengalami gangguan. Silakan coba lagi dalam beberapa saat.\n\n' +
        '💡 Jika masalah berlanjut, hubungi admin ya!',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        }
      );
    }
  }
});

// Clean expired sessions periodically
setInterval(cleanExpiredSessions, 5 * 60 * 1000); // Every 5 minutes

console.log('✅ Bot is running...');
console.log('🎯 Ready to receive donations!');

// Export bot instance for potential webhook usage
module.exports = { bot, orders, sessions };
