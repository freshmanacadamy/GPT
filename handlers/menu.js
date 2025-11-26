const bot = require('../config/bot');
const { REGISTRATION_FEE, REFERRAL_REWARD } = require('../config/environment');
const MessageHelper = require('../utils/messageHelper');

const showMainMenu = async (chatId) => {
    const keyboard = MessageHelper.getMainMenuButtons();

    const options = {
        reply_markup: {
            keyboard: keyboard,
            resize_keyboard: true
        }
    };
    
    const welcomeMessage = MessageHelper.getMessage('WELCOME', {
        fee: REGISTRATION_FEE,
        reward: REFERRAL_REWARD
    });
    
    await bot.sendMessage(chatId, welcomeMessage, { 
        parse_mode: 'Markdown', 
        ...options 
    });
};

module.exports = { showMainMenu };
