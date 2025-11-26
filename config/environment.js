require('dotenv').config();

module.exports = {
    // EXISTING VARIABLES - NO CHANGES
    BOT_TOKEN: process.env.BOT_TOKEN,
    CHANNEL_ID: process.env.CHANNEL_ID,
    ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [5747226778],
    REGISTRATION_FEE: parseInt(process.env.REGISTRATION_FEE) || 500,
    REFERRAL_REWARD: parseInt(process.env.REFERRAL_REWARD) || 30,
    MIN_REFERRALS_FOR_WITHDRAW: parseInt(process.env.MIN_REFERRALS_FOR_WITHDRAW) || 4,
    BOT_USERNAME: process.env.BOT_USERNAME || 'freshman_academy_jmubot',
    
    // NEW SYSTEM CONTROL VARIABLES
    MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true',
    INVITE_SYSTEM_ENABLED: process.env.INVITE_SYSTEM_ENABLED !== 'false',
    TUTORIAL_SYSTEM_ENABLED: process.env.TUTORIAL_SYSTEM_ENABLED !== 'false',
    WITHDRAWAL_SYSTEM_ENABLED: process.env.WITHDRAWAL_SYSTEM_ENABLED !== 'false',
    REGISTRATION_SYSTEM_ENABLED: process.env.REGISTRATION_SYSTEM_ENABLED !== 'false',
    
    // NEW DEFAULT MESSAGE VARIABLES
    MAINTENANCE_MESSAGE: process.env.MAINTENANCE_MESSAGE || '🚧 Bot is under maintenance. Please check back later.',
    REGISTRATION_DISABLED_MESSAGE: process.env.REGISTRATION_DISABLED_MESSAGE || '❌ Registration is temporarily closed.',
    TUTORIALS_DISABLED_MESSAGE: process.env.TUTORIALS_DISABLED_MESSAGE || '❌ Tutorial access is currently unavailable.',
    WITHDRAWAL_DISABLED_MESSAGE: process.env.WITHDRAWAL_DISABLED_MESSAGE || '❌ Withdrawals are temporarily suspended.',
    INVITE_DISABLED_MESSAGE: process.env.INVITE_DISABLED_MESSAGE || '❌ Referral program is currently paused.',
    
    // NEW ANALYTICS DASHBOARD VARIABLE
    ENABLE_ANALYTICS_DASHBOARD: process.env.ENABLE_ANALYTICS_DASHBOARD !== 'false'
};
