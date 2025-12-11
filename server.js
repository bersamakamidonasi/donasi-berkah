const express = require('express');
const { config } = require('./src/config/env');

// Import bot instance from index
let bot, sessions;
try {
  const botModule = require('./index');
  bot = botModule.bot;
  sessions = botModule.sessions;
} catch (error) {
  console.error('Failed to load bot from index:', error);
  process.exit(1);
}

const app = express();
const port = config.PORT || 3000;

// Middleware untuk parsing JSON
app.use(express.json());

// Endpoint untuk health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'Bot is running', timestamp: new Date().toISOString() });
});

// Endpoint untuk webhook Telegram
app.post(`/bot${config.BOT_TOKEN}`, (req, res) => {
  try {
    // Proses update dari Telegram
    const update = req.body;
    bot.processUpdate(update);
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mulai server
app.listen(port, async () => {
  try {
    const webhookUrl = `${config.BASE_URL}/bot${config.BOT_TOKEN}`;
    await bot.setWebHook(webhookUrl);
    console.log(`🌐 Server running on port ${port}`);
    console.log(`🚀 Webhook successfully set to: ${webhookUrl}`);
  } catch (error) {
    console.error('Failed to set webhook:', error);
  }
});

module.exports = app;
