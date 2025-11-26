const env = require('../config/environment');

const getFirebaseTimestamp = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
};

const validatePhoneNumber = (phone) => {
    return phone.startsWith('+') && phone.length >= 10;
};

const validateName = (name) => {
    return name && name.length >= 2 && name.length <= 50;
};

const formatCurrency = (amount) => {
    return `${amount} ETB`;
};

function checkFeatureStatus(feature) {
    if (env.MAINTENANCE_MODE) {
        return { allowed: false, message: env.MAINTENANCE_MESSAGE };
    }
    
    switch(feature) {
        case 'registration':
            if (!env.REGISTRATION_SYSTEM_ENABLED) {
                return { allowed: false, message: env.REGISTRATION_DISABLED_MESSAGE };
            }
            break;
        case 'tutorial':
            if (!env.TUTORIAL_SYSTEM_ENABLED) {
                return { allowed: false, message: env.TUTORIALS_DISABLED_MESSAGE };
            }
            break;
        case 'withdrawal':
            if (!env.WITHDRAWAL_SYSTEM_ENABLED) {
                return { allowed: false, message: env.WITHDRAWAL_DISABLED_MESSAGE };
            }
            break;
        case 'referral':
            if (!env.INVITE_SYSTEM_ENABLED) {
                return { allowed: false, message: env.INVITE_DISABLED_MESSAGE };
            }
            break;
    }
    
    return { allowed: true };
}

module.exports = {
    getFirebaseTimestamp,
    validatePhoneNumber,
    validateName,
    formatCurrency,
    checkFeatureStatus
};
