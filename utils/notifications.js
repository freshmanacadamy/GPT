const bot = require('../config/bot');
const { REGISTRATION_FEE, ADMIN_IDS } = require('../config/environment');

const notifyAdminsNewRegistration = async (user) => {
    if (!ADMIN_IDS || ADMIN_IDS.length === 0) {
        console.log('❌ ADMIN_IDS not set in environment variables');
        return;
    }

    console.log('📤 Sending to admin IDs:', ADMIN_IDS);

    try {
        const notificationMessage = 
            `📋 *NEW REGISTRATION REQUEST*\n\n` +
            `👤 *User Information:*\n` +
            `• Name: ${user.name}\n` +
            `• Phone: ${user.phone}\n` +
            `• Student Type: ${user.studentType === 'natural' ? 'Natural Science' : 'Social Science'}\n` +
            `• User ID: ${user.telegramId}\n\n` +
            `💳 *Payment Details:*\n` +
            `• Method: ${user.paymentMethod === 'telebirr' ? 'TeleBirr' : 'CBE Birr'}\n` +
            `• Amount: ${REGISTRATION_FEE} ETB\n` +
            `• Status: Pending Approval\n` +
            `• Submitted: ${new Date().toLocaleString()}`;

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
            },
            parse_mode: 'Markdown'
        };

        // Send to all admin IDs
        for (const adminId of ADMIN_IDS) {
            try {
                await bot.sendMessage(adminId, notificationMessage, options);
                console.log(`✅ Admin notification sent to: ${adminId} for user: ${user.telegramId}`);
            } catch (error) {
                console.error(`❌ Failed to send to admin ${adminId}:`, error);
            }
        }

    } catch (error) {
        console.error('❌ Error sending admin notification:', error);
    }
};

const notifyAdminsNewPayment = async (user, file_id) => {
    if (!ADMIN_IDS || ADMIN_IDS.length === 0) {
        console.log('❌ ADMIN_IDS not set in environment variables');
        return;
    }

    try {
        const notificationMessage = 
            `🔔 *NEW PAYMENT SCREENSHOT RECEIVED*\n\n` +
            `👤 *User Information:*\n` +
            `• Name: ${user.name}\n` +
            `• Phone: ${user.phone}\n` +
            `• Student Type: ${user.studentType === 'natural' ? 'Natural Science' : 'Social Science'}\n` +
            `• User ID: ${user.telegramId}\n\n` +
            `💳 *Payment Details:*\n` +
            `• Method: ${user.paymentMethod === 'telebirr' ? 'TeleBirr' : 'CBE Birr'}\n` +
            `• Amount: ${REGISTRATION_FEE} ETB\n` +
            `• Status: Pending Approval\n` +
            `• Submitted: ${new Date().toLocaleString()}`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Approve Payment', callback_data: `admin_approve_${user.telegramId}` },
                        { text: '❌ Reject Payment', callback_data: `admin_reject_${user.telegramId}` }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        };

        // Send to all admin IDs
        for (const adminId of ADMIN_IDS) {
            try {
                await bot.sendPhoto(adminId, file_id, {
                    caption: notificationMessage,
                    parse_mode: 'Markdown',
                    ...options
                });
                console.log(`✅ Payment screenshot notification sent to admin: ${adminId} for user: ${user.telegramId}`);
            } catch (error) {
                console.error(`❌ Failed to send payment notification to admin ${adminId}:`, error);
            }
        }
    } catch (error) {
        console.error('❌ Error sending payment notification:', error);
    }
};

const notifyAdminsWithdrawal = async (user, userId) => {
    if (!ADMIN_IDS || ADMIN_IDS.length === 0) {
        console.log('❌ ADMIN_IDS not set in environment variables');
        return;
    }

    // Send to all admin IDs
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
            console.log(`✅ Withdrawal notification sent to admin: ${adminId} for user: ${userId}`);
        } catch (error) {
            console.error(`❌ Failed to send withdrawal notification to admin ${adminId}:`, error);
        }
    }
};

module.exports = {
    notifyAdminsNewRegistration,
    notifyAdminsNewPayment,
    notifyAdminsWithdrawal
};
