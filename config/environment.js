require('dotenv').config();

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    CHANNEL_ID: process.env.CHANNEL_ID,
    ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [5747226778],
    REGISTRATION_FEE: parseInt(process.env.REGISTRATION_FEE) || 500,
    REFERRAL_REWARD: parseInt(process.env.REFERRAL_REWARD) || 30,
    MIN_REFERRALS_FOR_WITHDRAW: parseInt(process.env.MIN_REFERRALS_FOR_WITHDRAW) || 4,
    BOT_USERNAME: process.env.BOT_USERNAME || 'JU1confessionbot'
    INVITE_SYSTEM_ENABLED: process.env.INVITE_SYSTEM_ENABLED !== 'false' // Default to true
};

