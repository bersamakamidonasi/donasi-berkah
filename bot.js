require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const QRCode = require('qrcode');

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  // Don't exit, just log
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  // Don't exit, just log
});

const token = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_ID;

// Create bot instance with polling
const bot = new TelegramBot(token, { polling: true });

// Log successful bot initialization
console.log('🤖 Bot initialized successfully');
console.log('📡 Polling mode active');

// Pakasir API functions
async function createQrisTransaction(orderId, amount) {
  try {
    const response = await axios.post('https://app.pakasir.com/api/transactioncreate/qris', {
      project: process.env.PAKASIR_PROJECT,
      order_id: orderId,
      amount: amount,
      api_key: process.env.PAKASIR_API_KEY
    });
    return response.data;
  } catch (error) {
    console.error('Pakasir API Error:', error.response?.data || error.message);
    throw new Error('Failed to create QRIS transaction');
  }
}

async function generateQRCode(text) {
  try {
    return await QRCode.toBuffer(text, { type: 'png', width: 300 });
  } catch (error) {
    console.error('QR Code Generation Error:', error);
    throw new Error('Failed to generate QR code');
  }
}

function createQrisKeyboard(orderId) {
  return {
    inline_keyboard: [
      [{ text: '🔍 Cek Status Pembayaran', callback_data: `check:${orderId}` }]
    ]
  };
}

// In-memory storage for orders and sessions
let orders = {};
let sessions = {};

// Session timeout: 10 minutes
const SESSION_TIMEOUT = 10 * 60 * 1000;

// Amounts options
const amounts = [10000, 25000, 50000, 100000];

// Payment methods
const paymentMethods = ['ovo', 'gopay', 'dana', 'bank'];

// Function to create main reply keyboard
function createMainReplyKeyboard() {
  return {
    keyboard: [
      ['Rp10.000', 'Rp25.000'],
      ['Rp50.000', 'Rp100.000'],
      ['💰 Custom Nominal'],
      ['💳 Bayar']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

// Function to create payment keyboard
function createPaymentKeyboard() {
  const keyboard = paymentMethods.map(method => ({
    text: method.toUpperCase(),
    callback_data: `pay:${method}`
  }));
  return { inline_keyboard: [keyboard] };
}

// Function to create confirmation keyboard
function createConfirmKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Konfirmasi Transfer', callback_data: 'action:confirm' }],
      [{ text: 'Batal', callback_data: 'action:cancel' }]
    ]
  };
}

// Function to create admin keyboard
function createAdminKeyboard(orderId) {
  return {
    inline_keyboard: [
      [{ text: 'Verifikasi', callback_data: `admin:verify:${orderId}` }],
      [{ text: 'Tolak', callback_data: `admin:reject:${orderId}` }]
    ]
  };
}

// Function to get summary text
function getSummaryText(session) {
  let text = 'Donasi — Bantu Sesama\n\n';
  if (session.selectedAmount) {
    text += `Nominal: Rp${session.selectedAmount.toLocaleString()}\n`;
  } else {
    text += 'Nominal: Belum dipilih\n';
  }
  if (session.selectedPayment) {
    text += `Metode: ${session.selectedPayment.toUpperCase()}\n`;
  } else {
    text += 'Metode: Belum dipilih\n';
  }
  return text;
}

// Function to clean expired sessions
function cleanExpiredSessions() {
  const now = Date.now();
  for (const userId in sessions) {
    if (now - sessions[userId].lastActivity > SESSION_TIMEOUT) {
      delete sessions[userId];
    }
  }
}

// Generate order ID
function generateOrderId() {
  return 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5);
}

// Handle /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  sessions[userId] = {
    selectedAmount: null,
    awaitingCustomAmount: false,
    lastActivity: Date.now()
  };

  const text = '🎉 **Donasi — Bantu Sesama**\n\nMari bantu sesama dengan donasi Anda!\n\n💰 **Pilih nominal donasi di bawah**\n\nGunakan tombol keyboard untuk memilih:';
  const keyboard = createMainReplyKeyboard();

  bot.sendMessage(chatId, text, {
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
});

// Handle callback queries (only for status checking)
bot.on('callback_query', async (query) => {
  const data = query.data;

  if (data.startsWith('check:')) {
    const orderId = data.split(':')[1];
    // Handle status check
    try {
      const statusData = await checkQrisStatus(orderId, orders[orderId]?.amount);
      if (statusData.status === 'completed') {
        orders[orderId].status = 'verified';
        bot.sendMessage(orders[orderId].userId, '✅ Pembayaran berhasil diverifikasi!');
        bot.sendMessage('7325378401', `📢 Donasi Masuk!\n👤 ${orders[orderId].username}\n💰 Rp${orders[orderId].amount.toLocaleString()}\n✅ BERHASIL`);
      }
      bot.answerCallbackQuery(query.id, { text: `Status: ${statusData.status.toUpperCase()}` });
    } catch (error) {
      bot.answerCallbackQuery(query.id, { text: 'Gagal cek status' });
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
  if (text === 'Rp10.000') {
    sessions[userId].selectedAmount = 10000;
    bot.sendMessage(chatId, '✅ **Nominal terpilih: Rp10.000**\n\nSilakan pilih nominal lain atau tekan "💳 Bayar" untuk melanjutkan.', {
      reply_markup: createMainReplyKeyboard(),
      parse_mode: 'Markdown'
    });

  } else if (text === 'Rp25.000') {
    sessions[userId].selectedAmount = 25000;
    bot.sendMessage(chatId, '✅ **Nominal terpilih: Rp25.000**\n\nSilakan pilih nominal lain atau tekan "💳 Bayar" untuk melanjutkan.', {
      reply_markup: createMainReplyKeyboard(),
      parse_mode: 'Markdown'
    });

  } else if (text === 'Rp50.000') {
    sessions[userId].selectedAmount = 50000;
    bot.sendMessage(chatId, '✅ **Nominal terpilih: Rp50.000**\n\nSilakan pilih nominal lain atau tekan "💳 Bayar" untuk melanjutkan.', {
      reply_markup: createMainReplyKeyboard(),
      parse_mode: 'Markdown'
    });

  } else if (text === 'Rp100.000') {
    sessions[userId].selectedAmount = 100000;
    bot.sendMessage(chatId, '✅ **Nominal terpilih: Rp100.000**\n\nSilakan pilih nominal lain atau tekan "💳 Bayar" untuk melanjutkan.', {
      reply_markup: createMainReplyKeyboard(),
      parse_mode: 'Markdown'
    });

  } else if (text === '💰 Custom Nominal') {
    sessions[userId].awaitingCustomAmount = true;
    bot.sendMessage(chatId, '💰 **Masukkan jumlah donasi custom (minimal Rp1.000):**\n\nKirim angka saja, contoh: `15000`', {
      reply_markup: { force_reply: true }
    });

  } else if (text === '💳 Bayar') {
    if (!sessions[userId].selectedAmount) {
      bot.sendMessage(chatId, '❌ **Pilih nominal donasi terlebih dahulu!**\n\nGunakan tombol di bawah untuk memilih nominal.', {
        reply_markup: createMainReplyKeyboard(),
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

      // Send QR code
      const qrBuffer = await generateQRCode(qrisResponse.payment_number);
      await bot.sendPhoto(chatId, qrBuffer, {
        caption: `💰 *Total Pembayaran:* Rp${qrisResponse.total_payment.toLocaleString()}\n⏰ *Batas Waktu:* ${new Date(qrisResponse.expired_at).toLocaleString('id-ID')}\n\nScan QRIS di atas untuk menyelesaikan pembayaran.`,
        parse_mode: 'Markdown',
        reply_markup: createQrisKeyboard(orderId)
      });

      // Clear session
      sessions[userId].selectedAmount = null;
      sessions[userId].awaitingCustomAmount = false;

    } catch (error) {
      console.error('QRIS creation error:', error);
      bot.sendMessage(chatId, '❌ Maaf, terjadi kesalahan dalam membuat transaksi. Silakan coba lagi.', {
        reply_markup: createMainReplyKeyboard()
      });
    }

  } else if (sessions[userId].awaitingCustomAmount) {
    // Handle custom amount input
    const amount = parseInt(text.replace(/[^\d]/g, ''));
    if (isNaN(amount) || amount < 1000) {
      bot.sendMessage(chatId, '❌ **Jumlah tidak valid!**\n\nMinimal donasi Rp1.000. Silakan masukkan angka yang benar:', {
        reply_markup: { force_reply: true }
      });
    } else {
      sessions[userId].selectedAmount = amount;
      sessions[userId].awaitingCustomAmount = false;
      bot.sendMessage(chatId, `✅ **Nominal custom terpilih: Rp${amount.toLocaleString()}**\n\nTekan "💳 Bayar" untuk melanjutkan.`, {
        reply_markup: createMainReplyKeyboard(),
        parse_mode: 'Markdown'
      });
    }
  }
});

console.log('Bot is running...');
