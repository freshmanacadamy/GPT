const bot = require('../config/bot');
const { ADMIN_IDS } = require('../config/environment');

const handleHelp = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const isAdmin = ADMIN_IDS.includes(userId);

    let helpMessage = 
        `❓ *HELP & SUPPORT*\n\n` +
        `📚 *Registration Process:*\n` +
        `1. Fill the registration form\n` +
        `2. Select payment method\n` +
        `3. Upload payment screenshot\n` +
        `4. Wait for admin approval\n\n` +
        `🎁 *Referral System:*\n` +
        `• Share your referral link\n` +
        `• Earn rewards for each successful referral\n` +
        `• Withdraw rewards when you reach minimum threshold\n\n` +
        `📊 *Features:*\n` +
        `• Track your referrals\n` +
        `• View leaderboard\n` +
        `• Check your profile\n\n` +
        `Need more help? Contact support!`;

    if (isAdmin) {
        helpMessage += `\n\n⚡ *ADMIN COMMANDS:*\n` +
            `/admin - Admin panel\n` +
            `/stats - Student statistics\n` +
            `/users - All users\n` +
            `/payments - Pending payments`;
    }

    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
};

const handleRules = async (msg) => {
    const chatId = msg.chat.id;

    const rulesMessage = 
        `📌 *RULES & GUIDELINES*\n\n` +
        `✅ *Registration:*\n` +
        `• Provide accurate information\n` +
        `• Upload valid payment screenshot\n` +
        `• Follow payment instructions\n\n` +
        `🎁 *Referral System:*\n` +
        `• Referrals must be legitimate users\n` +
        `• No fake accounts allowed\n` +
        `• Rewards are paid after verification\n\n` +
        `⚠️ *Prohibited:*\n` +
        `• Spam or fake registrations\n` +
        `• Multiple accounts\n` +
        `• Violation of terms\n\n` +
        `By using this bot, you agree to these rules.`;

    await bot.sendMessage(chatId, rulesMessage, { parse_mode: 'Markdown' });
};

module.exports = {
    handleHelp,
    handleRules
};
