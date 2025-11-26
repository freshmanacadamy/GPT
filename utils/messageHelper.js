const env = require('../config/environment');

class MessageHelper {
    static replacePlaceholders(text, variables = {}) {
        let result = text;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`{${key}}`, 'g'), value);
        }
        return result;
    }

    static getButtonText(buttonKey) {
        return env.BUTTON_TEXTS[buttonKey] || buttonKey;
    }

    static getMessage(messageKey, variables = {}) {
        const message = env.MESSAGES[messageKey] || messageKey;
        return this.replacePlaceholders(message, variables);
    }

    // Get all buttons for a specific section
    static getMainMenuButtons() {
        const { checkFeatureStatus } = require('./helpers');
        const registrationStatus = checkFeatureStatus('registration');
        const referralStatus = checkFeatureStatus('referral');
        
        const keyboard = [];
        
        if (registrationStatus.allowed) {
            keyboard.push([this.getButtonText('REGISTER')]);
        }
        
        if (referralStatus.allowed) {
            keyboard.push([
                this.getButtonText('PAY_FEE'), 
                this.getButtonText('INVITE')
            ]);
            keyboard.push([
                this.getButtonText('LEADERBOARD'), 
                this.getButtonText('HELP')
            ]);
        } else {
            keyboard.push([
                this.getButtonText('PAY_FEE')
            ]);
            keyboard.push([
                this.getButtonText('HELP')
            ]);
        }
        
        keyboard.push([
            this.getButtonText('RULES'), 
            this.getButtonText('PROFILE')
        ]);

        return keyboard;
    }

    static getRegistrationButtons() {
        return [
            [this.getButtonText('SHARE_PHONE')],
            [this.getButtonText('CANCEL_REG'), this.getButtonText('HOMEPAGE')]
        ];
    }

    static getProfileButtons() {
        return [
            [this.getButtonText('WITHDRAW'), this.getButtonText('CHANGE_PAYMENT')],
            [this.getButtonText('MY_REFERRALS'), this.getButtonText('HOMEPAGE')]
        ];
    }

    static getAdminButtons() {
        return [
            [this.getButtonText('MANAGE_STUDENTS'), this.getButtonText('REVIEW_PAYMENTS')],
            [this.getButtonText('BOT_SETTINGS'), this.getButtonText('MESSAGE_SETTINGS')],
            [this.getButtonText('FEATURE_TOGGLE'), this.getButtonText('STUDENT_STATS')],
            [this.getButtonText('BROADCAST'), this.getButtonText('HOMEPAGE')]
        ];
    }
}

module.exports = MessageHelper;
