const bot = require('../config/bot');
const { REGISTRATION_FEE } = require('../config/environment');

// Get admin ID from environment
const getAdminId = () => {
    return process.env.ADMIN_ID;
};

const notifyAdminsNewRegistration = async (user) => {
    const adminId = getAdminId();
    
    if (!adminId) {
        console.log('❌ ADMIN_ID not set in environment variables');
        return;
    }

    console.log('📤 Sending to admin ID:', adminId);

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

        await bot.sendMessage(adminId, notificationMessage, options);
        console.log(`✅ Admin notification sent for user: ${user.telegramId}`);
    } catch (error) {
        console.error('❌ Error sending admin notification:', error);
    }
};

// Keep your existing functions for payment and withdrawal
const notifyAdminsNewPayment = async (user, file_id) => {
    const adminId = getAdminId();
    
    if (!adminId) {
        console.log('❌ ADMIN_ID not set in environment variables');
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

        await bot.sendPhoto(adminId, file_id, {
            caption: notificationMessage,
            parse_mode: 'Markdown',
            ...options
        });
        console.log(`✅ Payment screenshot notification sent for user: ${user.telegramId}`);
    } catch (error) {
        console.error('❌ Error sending payment notification:', error);
    }
};

const notifyAdminsWithdrawal = async (user, userId) => {
    const adminId = getAdminId();
    
    if (!adminId) {
        console.log('❌ ADMIN_ID not set in environment variables');
        return;
    }

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
        console.log(`✅ Withdrawal notification sent for user: ${userId}`);
    } catch (error) {
        console.error('❌ Error sending withdrawal notification:', error);
    }
};

module.exports = {
    notifyAdminsNewRegistration,
    notifyAdminsNewPayment,
    notifyAdminsWithdrawal
};
