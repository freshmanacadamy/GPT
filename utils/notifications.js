const bot = require('../config/bot');
const { ADMIN_IDS, REGISTRATION_FEE } = require('../config/environment');

const notifyAdminsNewPayment = async (user, file_id) => {
    const notificationMessage = 
        `🔔 *NEW PAYMENT RECEIVED*\n\n` +
        `👤 *User Information:*\n` +
        `• Name: ${user.name}\n` +
        `• Phone: ${user.phone}\n` +
        `• Student Type: ${user.studentType}\n` +
        `• User ID: ${user.telegramId}\n\n` +
        `💳 *Payment Details:*\n` +
        `• Method: ${user.paymentMethod}\n` +
        `• Amount: ${REGISTRATION_FEE} ETB\n` +
        `• Status: Pending Approval\n` +
        `• Submitted: ${new Date().toLocaleString()}\n\n` +
        `⚡ *QUICK ACTIONS:*`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Approve', callback_data: `admin_approve_${user.telegramId}` },
                    { text: '❌ Reject', callback_data: `admin_reject_${user.telegramId}` }
                ],
                [
                    { text: '🔍 View Details', callback_data: `admin_details_${user.telegramId}` }
                ]
            ]
        }
    };

    for (const adminId of ADMIN_IDS) {
        try {
            await bot.sendPhoto(adminId, file_id, {
                caption: notificationMessage,
                parse_mode: 'Markdown',
                ...options
            });
        } catch (error) {
            console.error(`Failed to notify admin ${adminId}:`, error);
        }
    }
};

const notifyAdminsWithdrawal = async (user, userId) => {
    for (const adminId of ADMIN_IDS) {
        try {
            await bot.sendMessage(adminId,
                `🔔 *NEW WITHDRAWAL REQUEST*\n\n` +
                `👤 User: ${user.firstName}\n` +
                `💰 Amount: ${user.rewards} ETB\n` +
                `💳 Method: ${user.paymentMethodPreference}\n` +
                `📱 Account: ${user.accountNumber}\n` +
                `🆔 User ID: ${userId}`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error(`Failed to notify admin ${adminId}:`, error);
        }
    }
};

module.exports = {
    notifyAdminsNewPayment,
    notifyAdminsWithdrawal
};
