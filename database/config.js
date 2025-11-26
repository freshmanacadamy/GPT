const db = require('../config/firebase');

const CONFIG_COLLECTION = 'bot_config';

// Default configuration values
const DEFAULT_CONFIG = {
    // Financial Settings
    'registration_fee': 500,
    'referral_reward': 30,
    'min_referrals_withdraw': 4,
    'min_withdrawal_amount': 120,
    
    // Feature Toggles
    'maintenance_mode': false,
    'registration_enabled': true,
    'referral_enabled': true,
    'withdrawal_enabled': true,
    'tutorial_enabled': true,
    
    // System Messages
    'maintenance_message': '🚧 Bot is under maintenance. Please check back later.',
    'registration_disabled_message': '❌ Registration is temporarily closed.',
    'referral_disabled_message': '❌ Referral program is currently paused.',
    'withdrawal_disabled_message': '❌ Withdrawals are temporarily suspended.',
    'tutorials_disabled_message': '❌ Tutorial access is currently unavailable.',
    
    // Welcome Messages
    'welcome_message': '🎯 *COMPLETE TUTORIAL REGISTRATION BOT*\\n\\n📚 Register for comprehensive tutorials\\n💰 Registration fee: {fee} ETB\\n🎁 Earn {reward} ETB per referral\\n\\nChoose an option below:',
    'start_message': '🎯 *Welcome to Tutorial Registration Bot!*\\n\\n📚 Register for our comprehensive tutorials\\n💰 Registration fee: {fee} ETB\\n🎁 Earn {reward} ETB per referral\\n\\nStart your registration journey!',
    
    // Registration Messages
    'reg_start': '👤 *ENTER YOUR FULL NAME*\\n\\nPlease type your full name:',
    'reg_name_saved': '✅ Name saved: *{name}*\\n\\n📱 *SHARE YOUR PHONE NUMBER*\\n\\nPlease share your phone number using the button below:',
    'reg_phone_saved': '✅ Phone saved: *{phone}*\\n\\n🎓 *SELECT YOUR STREAM*\\n\\nChoose your field of study:',
    'reg_success': '🎉 *REGISTRATION SUCCESSFUL!*\\n\\n✅ Your registration is complete\\n✅ Payment verification pending\\n⏳ Please wait for admin approval\\n\\n_You will be notified once approved._',
    
    // Button Texts
    'btn_register': '📚 Register for Tutorial',
    'btn_profile': '👤 My Profile',
    'btn_invite': '🎁 Invite & Earn',
    'btn_withdraw': '💰 Withdraw Rewards',
    'btn_help': '❓ Help',
    'btn_rules': '📌 Rules',
    'btn_leaderboard': '📈 Leaderboard',
    'btn_pay_fee': '💰 Pay Tutorial Fee',
    'btn_confirm_reg': '✅ Confirm Registration',
    'btn_cancel_reg': '❌ Cancel Registration',
    'btn_homepage': '🏠 Homepage',
    'btn_share_phone': '📲 Share My Phone Number',
    'btn_upload_screenshot': '📎 Upload Payment Screenshot',
    'btn_change_payment': '💳 Change Payment Method',
    'btn_my_referrals': '📊 My Referrals',
    'btn_admin_panel': '🛠️ Admin Panel',
    'btn_manage_students': '👥 Manage Students',
    'btn_review_payments': '💰 Review Payments',
    'btn_student_stats': '📊 Student Stats',
    'btn_broadcast': '📢 Broadcast Message',
    'btn_bot_settings': '⚙️ Bot Settings',
    'btn_message_settings': '📝 Message Settings',
    'btn_feature_toggle': '🔄 Feature Toggle'
};

class ConfigService {
    // Get a single config value
    static async get(key) {
        try {
            const doc = await db.collection(CONFIG_COLLECTION).doc(key).get();
            if (doc.exists) {
                return doc.data().value;
            }
            // Fallback to environment variables, then defaults
            return process.env[key.toUpperCase()] || DEFAULT_CONFIG[key];
        } catch (error) {
            console.error('Error getting config:', error);
            return DEFAULT_CONFIG[key];
        }
    }

    // Set a config value
    static async set(key, value) {
        try {
            await db.collection(CONFIG_COLLECTION).doc(key).set({
                value: value,
                updatedAt: new Date(),
                updatedBy: 'admin'
            });
            return true;
        } catch (error) {
            console.error('Error setting config:', error);
            return false;
        }
    }

    // Get multiple config values at once
    static async getMultiple(keys) {
        const config = {};
        for (const key of keys) {
            config[key] = await this.get(key);
        }
        return config;
    }

    // Get all configuration
    static async getAll() {
        try {
            const snapshot = await db.collection(CONFIG_COLLECTION).get();
            const config = { ...DEFAULT_CONFIG };
            
            snapshot.forEach(doc => {
                config[doc.id] = doc.data().value;
            });
            
            return config;
        } catch (error) {
            console.error('Error getting all config:', error);
            return DEFAULT_CONFIG;
        }
    }

    // Reset to default values
    static async resetToDefault(key = null) {
        try {
            if (key) {
                // Reset single key
                if (DEFAULT_CONFIG[key] !== undefined) {
                    await this.set(key, DEFAULT_CONFIG[key]);
                }
            } else {
                // Reset all keys
                for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
                    await this.set(key, value);
                }
            }
            return true;
        } catch (error) {
            console.error('Error resetting config:', error);
            return false;
        }
    }
}

module.exports = ConfigService;
