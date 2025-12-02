const TelegramBot = require('node-telegram-bot-api');
const { BOT_TOKEN } = require('./environment');

if (!BOT_TOKEN) {
    throw new Error('❌ BOT_TOKEN environment variable is required');
}

// Vercel deployment uses webhooks, not polling
const bot = new TelegramBot(BOT_TOKEN, { polling: false });
module.exports = bot;
