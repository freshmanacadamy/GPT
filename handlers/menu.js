const bot = require('../config/bot');
const { REGISTRATION_FEE, REFERRAL_REWARD } = require('../config/environment');

const showMainMenu = async (chatId) => {
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: '📚 Register for Tutorial' }],
                 [{ text: '💰 Pay Tutorial Fee' }, { text: '🎁 Invite & Earn' }],
                [{ text: '' }, { text: ''}],
                [{ text: '📈 Leaderboard' }, { text: '❓ Help' }],
                [{ text: '📌 Rules' }, { text: '👤 My Profile' }]
            ],
            resize_keyboard: true
        }
    };
    
    await bot.sendMessage(chatId,
        `🎯 *COMPLETE TUTORIAL REGISTRATION BOT*\n\n` +
        `📚 Register for comprehensive tutorials\n` +
        `💰 Registration fee: ${REGISTRATION_FEE} ETB\n` +
        `🎁 Earn ${REFERRAL_REWARD} ETB per referral\n\n` +
        `Choose an option below:`,
        { parse_mode: 'Markdown', ...options }
    );
};

module.exports = { showMainMenu };



