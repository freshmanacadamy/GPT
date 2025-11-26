require('dotenv').config();
const ConfigService = require('../database/config');

// This will be populated with live values from database
let liveConfig = {};

// Initialize config on startup
const initializeConfig = async () => {
    try {
        liveConfig = await ConfigService.getAll();
        console.log('✅ Bot configuration loaded from database');
    } catch (error) {
        console.error('❌ Failed to load config from database, using defaults');
        liveConfig = {};
    }
};

// Helper function to get config value
const getConfig = (key) => {
    return liveConfig[key] !== undefined ? liveConfig[key] : (process.env[key.toUpperCase()] || null);
};

// Helper function to get boolean config value
const getBoolConfig = (key) => {
    const value = getConfig(key);
    return value === true || value === 'true' || value === '1';
};

// Helper function to get numeric config value
const getNumericConfig = (key, defaultValue = 0) => {
    const value = getConfig(key);
    const num = parseInt(value);
    return isNaN(num) ? defaultValue : num;
};

module.exports = {
    // Live configuration getters
    get REGISTRATION_FEE() { return getNumericConfig('registration_fee', 500); },
    get REFERRAL_REWARD() { return getNumericConfig('referral_reward', 30); },
    get MIN_REFERRALS_FOR_WITHDRAW() { return getNumericConfig('min_referrals_withdraw', 4); },
    get MIN_WITHDRAWAL_AMOUNT() { return getNumericConfig('min_withdrawal_amount', 120); },
    
    get MAINTENANCE_MODE() { return getBoolConfig('maintenance_mode'); },
    get REGISTRATION_SYSTEM_ENABLED() { return getBoolConfig('registration_enabled'); },
    get INVITE_SYSTEM_ENABLED() { return getBoolConfig('referral_enabled'); },
    get WITHDRAWAL_SYSTEM_ENABLED() { return getBoolConfig('withdrawal_enabled'); },
    get TUTORIAL_SYSTEM_ENABLED() { return getBoolConfig('tutorial_enabled'); },
    
    // Messages
    get MAINTENANCE_MESSAGE() { return getConfig('maintenance_message') || '🚧 Bot is under maintenance. Please check back later.'; },
    get REGISTRATION_DISABLED_MESSAGE() { return getConfig('registration_disabled_message') || '❌ Registration is temporarily closed.'; },
    get INVITE_DISABLED_MESSAGE() { return getConfig('referral_disabled_message') || '❌ Referral program is currently paused.'; },
    get WITHDRAWAL_DISABLED_MESSAGE() { return getConfig('withdrawal_disabled_message') || '❌ Withdrawals are temporarily suspended.'; },
    get TUTORIALS_DISABLED_MESSAGE() { return getConfig('tutorials_disabled_message') || '❌ Tutorial access is currently unavailable.'; },

    // Button Texts
    get BUTTON_TEXTS() {
        return {
            REGISTER: getConfig('btn_register') || '📚 Register for Tutorial',
            PROFILE: getConfig('btn_profile') || '👤 My Profile',
            INVITE: getConfig('btn_invite') || '🎁 Invite & Earn',
            WITHDRAW: getConfig('btn_withdraw') || '💰 Withdraw Rewards',
            HELP: getConfig('btn_help') || '❓ Help',
            RULES: getConfig('btn_rules') || '📌 Rules',
            LEADERBOARD: getConfig('btn_leaderboard') || '📈 Leaderboard',
            PAY_FEE: getConfig('btn_pay_fee') || '💰 Pay Tutorial Fee',
            CONFIRM_REG: getConfig('btn_confirm_reg') || '✅ Confirm Registration',
            CANCEL_REG: getConfig('btn_cancel_reg') || '❌ Cancel Registration',
            HOMEPAGE: getConfig('btn_homepage') || '🏠 Homepage',
            SHARE_PHONE: getConfig('btn_share_phone') || '📲 Share My Phone Number',
            UPLOAD_SCREENSHOT: getConfig('btn_upload_screenshot') || '📎 Upload Payment Screenshot',
            CHANGE_PAYMENT: getConfig('btn_change_payment') || '💳 Change Payment Method',
            MY_REFERRALS: getConfig('btn_my_referrals') || '📊 My Referrals',
            ADMIN_PANEL: getConfig('btn_admin_panel') || '🛠️ Admin Panel',
            MANAGE_STUDENTS: getConfig('btn_manage_students') || '👥 Manage Students',
            REVIEW_PAYMENTS: getConfig('btn_review_payments') || '💰 Review Payments',
            STUDENT_STATS: getConfig('btn_student_stats') || '📊 Student Stats',
            BROADCAST: getConfig('btn_broadcast') || '📢 Broadcast Message',
            BOT_SETTINGS: getConfig('btn_bot_settings') || '⚙️ Bot Settings',
            MESSAGE_SETTINGS: getConfig('btn_message_settings') || '📝 Message Settings',
            FEATURE_TOGGLE: getConfig('btn_feature_toggle') || '🔄 Feature Toggle'
        };
    },

    // Messages
    get MESSAGES() {
        return {
            WELCOME: getConfig('welcome_message') || '🎯 *COMPLETE TUTORIAL REGISTRATION BOT*\\n\\n📚 Register for comprehensive tutorials\\n💰 Registration fee: {fee} ETB\\n🎁 Earn {reward} ETB per referral\\n\\nChoose an option below:',
            START_WELCOME: getConfig('start_message') || '🎯 *Welcome to Tutorial Registration Bot!*\\n\\n📚 Register for our comprehensive tutorials\\n💰 Registration fee: {fee} ETB\\n🎁 Earn {reward} ETB per referral\\n\\nStart your registration journey!',
            REG_START: getConfig('reg_start') || '👤 *ENTER YOUR FULL NAME*\\n\\nPlease type your full name:',
            REG_NAME_SAVED: getConfig('reg_name_saved') || '✅ Name saved: *{name}*\\n\\n📱 *SHARE YOUR PHONE NUMBER*\\n\\nPlease share your phone number using the button below:',
            REG_PHONE_SAVED: getConfig('reg_phone_saved') || '✅ Phone saved: *{phone}*\\n\\n🎓 *SELECT YOUR STREAM*\\n\\nChoose your field of study:',
            REG_SUCCESS: getConfig('reg_success') || '🎉 *REGISTRATION SUCCESSFUL!*\\n\\n✅ Your registration is complete\\n✅ Payment verification pending\\n⏳ Please wait for admin approval\\n\\n_You will be notified once approved._'
        };
    },

    // Original environment variables (for backward compatibility)
    BOT_TOKEN: process.env.BOT_TOKEN,
    CHANNEL_ID: process.env.CHANNEL_ID,
    ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [5747226778],
    BOT_USERNAME: process.env.BOT_USERNAME || 'freshman_academy_jmubot',

    // Export the config service for admin use
    ConfigService,
    initializeConfig,
    
    // Helper to refresh config (call this after making changes)
    async refreshConfig() {
        liveConfig = await ConfigService.getAll();
    }
};
