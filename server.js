const express = require('express');
const { config } = require('./src/config/env');
const logger = require('./src/utils/logger');

// Import bot instance and handlers from index
let bot, sessions, handleSuccessfulPayment;
try {
  const botModule = require('./index');
  bot = botModule.bot;
  sessions = botModule.sessions;
  handleSuccessfulPayment = botModule.handleSuccessfulPayment;
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
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    logger.error('Error processing Telegram webhook:', error);
    res.sendStatus(500);
  }
});

// Endpoint untuk webhook Pakasir
app.post('/webhook/pakasir', async (req, res) => {
  try {
    const webhookData = req.body;
    logger.info('Received Pakasir webhook:', webhookData);

    // Basic validation
    if (webhookData && webhookData.order_id && webhookData.status === 'completed') {
      await handleSuccessfulPayment(webhookData.order_id);
      res.status(200).json({ status: 'ok', message: 'Webhook processed' });
    } else {
      logger.warn('Pakasir webhook received with non-completed status or invalid data.');
      res.status(200).json({ status: 'ok', message: 'Webhook ignored' });
    }
  } catch (error) {
    logger.error('Error processing Pakasir webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Mulai server
app.listen(port, async () => {
  try {
    const webhookUrl = `${config.BASE_URL}/bot${config.BOT_TOKEN}`;
    await bot.setWebHook(webhookUrl);
    logger.info(`🌐 Server running on port ${port}`);
    logger.info(`🚀 Telegram webhook set to: ${webhookUrl}`);
    logger.info(`🔔 Pakasir webhook endpoint is: ${config.BASE_URL}/webhook/pakasir`);
  } catch (error) {
    logger.error('Failed to set webhook:', error);
  }
});

module.exports = app;
