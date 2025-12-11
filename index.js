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
const { createQrisTransaction, checkQrisStatus, simulatePayment } = require('./src/services/pakasirService');
const { saveOrder, updateOrder, getTotalDonations, getOrderById } = require('./src/services/orderService');
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

// In-memory storage for user sessions
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

  // Fetch total donations
  const totalDonations = await getTotalDonations();

  // Enhanced welcome message with better formatting and emotional appeal
  const welcomeMessage = `
╔═══════════════════════╗
   ✨ *SELAMAT DATANG* ✨
╚═══════════════════════╝

Hai *${firstName}*! 👋

Terima kasih sudah membuka hatimu untuk *berbagi kebahagiaan* dengan sesama 💝

*Total donasi terkumpul saat ini:*
💰 *Rp${totalDonations.toLocaleString()}*

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
      `Selamat datang ${firstName}! Mari berbagi kebahagiaan dengan donasi. Total terkumpul: Rp${totalDonations.toLocaleString()}. Pilih nominal di bawah ini:`,
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
    
    try {
      // Get order from DB to check amount
      const order = await getOrderById(orderId);
      if (!order) {
        await bot.answerCallbackQuery(query.id, { text: 'Order tidak ditemukan.' });
        return;
      }

      const statusData = await checkQrisStatus(orderId, order.amount);
      
      if (statusData.status === 'completed') {
        // Update status in DB
        await updateOrder(orderId, { 
          status: 'completed',
          completed_at: new Date().toISOString() 
        });

        // New success message
        const successMessage = `
✅ *PEMBAYARAN BERHASIL!*

Terima kasih banyak atas donasi Anda! 🎉

Setiap dukungan yang Anda berikan sangat berarti untuk keberlangsungan dan pengembangan server ini agar dapat terus melayani.

💰 *Nominal:* Rp${order.amount.toLocaleString()}
📅 *Tanggal:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

━━━━━━━━━━━━━━━━━━━

Semoga kebaikan Anda dibalas dengan berlipat ganda. Barakallah! 🙏

🌟 Mau donasi lagi? Ketik /start
`;

        await bot.sendMessage(order.user_id, successMessage, {
          parse_mode: 'Markdown'
        });

        // Delete the original QR code message
        if (order.qr_message_id) {
          try {
            await bot.deleteMessage(order.user_id, order.qr_message_id);
          } catch (err) {
            logger.error('Failed to delete QR message, it might have been deleted already:', err);
          }
        }

        // Enhanced notification to owner
        await bot.sendMessage(config.OWNER_ID,
          `🎊 *DONASI BARU MASUK!*\n\n` +
          `👤 *Donatur:* ${order.username}\n` +
          `💰 *Nominal:* Rp${order.amount.toLocaleString()}\n` +
          `📅 *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n` +
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
    logger.info(`Creating transaction with order_id: ${orderId}`);
    try {
      const qrisResponse = await createQrisTransaction(orderId, sessions[userId].selectedAmount);

      // Save order to database
      await saveOrder({
        order_id: orderId,
        user_id: userId,
        username: msg.from.username || msg.from.first_name,
        amount: sessions[userId].selectedAmount,
        payment_method: 'qris',
        status: 'pending',
        qr_string: qrisResponse.payment_number,
        expired_at: qrisResponse.expired_at
      });

      // Generate QR code using the QRCode library directly
      const qrBuffer = await QRCode.toBuffer(qrisResponse.payment_number, { type: 'png', width: 300 });

      // Enhanced payment message
      const expirationDate = new Date(qrisResponse.expired_at);
      const paymentMessage = `
╔═══════════════════════╗
   💳 *LANJUTKAN PEMBAYARAN*
╚═══════════════════════╝

💰 *Total Pembayaran:*
   Rp${qrisResponse.total_payment.toLocaleString()}

⏰ *Batas Waktu:*
   ${expirationDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

━━━━━━━━━━━━━━━━━━━

📱 *Cara Bayar:*
1. Buka aplikasi mobile banking/e-wallet
2. Pilih menu QRIS/Scan
3. Scan QR code di atas
4. Konfirmasi pembayaran

━━━━━━━━━━━━━━━━━━━

✅ Klik tombol "Cek Status" setelah bayar untuk verifikasi otomatis!
`;

      const sentMessage = await bot.sendPhoto(chatId, qrBuffer, {
        caption: paymentMessage,
        parse_mode: 'Markdown',
        reply_markup: createQrisStatusInlineKeyboard(orderId)
      });

      // Save the message_id to the order for later deletion
      await updateOrder(orderId, { qr_message_id: sentMessage.message_id });

      // Schedule QR code deletion on expiration
      const delay = expirationDate.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(async () => {
          try {
            // Check if order is still pending before deleting
            const order = await getOrderById(orderId);
            if (order && order.status === 'pending') {
              await bot.deleteMessage(chatId, sentMessage.message_id);
              await bot.sendMessage(chatId, '⌛️ Waktu pembayaran untuk QRIS ini telah habis. Silakan ketik /start untuk membuat donasi baru.');
            }
          } catch (err) {
            logger.error('Error in scheduled QR deletion:', err);
          }
        }, delay);
      }

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

// Handle /simulate_payment command (owner only)
bot.onText(/\/simulate_payment (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const orderId = match[1];

  // Ensure only the owner can run this command
  if (String(userId) !== String(config.OWNER_ID)) {
    return bot.sendMessage(chatId, '🚫 Perintah ini hanya untuk owner.');
  }

  if (!orderId) {
    return bot.sendMessage(chatId, '⚠️ Mohon sertakan Order ID. Contoh: `/simulate_payment 123-ABC`');
  }

  try {
    // Get order from DB to get the amount
    const order = await getOrderById(orderId);
    if (!order) {
      return bot.sendMessage(chatId, `❌ Order dengan ID \`${orderId}\` tidak ditemukan.`, { parse_mode: 'Markdown' });
    }

    if (order.status !== 'pending') {
      return bot.sendMessage(chatId, `⚠️ Order \`${orderId}\` sudah tidak pending (status: ${order.status}).`, { parse_mode: 'Markdown' });
    }

    // Trigger the simulation
    await simulatePayment(order.order_id, order.amount);

    await bot.sendMessage(chatId, `✅ Simulasi pembayaran untuk order \`${orderId}\` berhasil dijalankan. Webhook akan segera diproses.`, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error in payment simulation command:', error);
    await bot.sendMessage(chatId, `🔥 Gagal menjalankan simulasi untuk order \`${orderId}\`. Cek log untuk detail.`, { parse_mode: 'Markdown' });
  }
});

// Clean expired sessions periodically
setInterval(cleanExpiredSessions, 5 * 60 * 1000); // Every 5 minutes

console.log('✅ Bot is running...');
console.log('🎯 Ready to receive donations!');

// Export bot instance for potential webhook usage
module.exports = { bot, sessions };
